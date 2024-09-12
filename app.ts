import 'dotenv/config'

import { parse } from "csv-parse/sync";
import fs from "fs";
import { DateTime } from "luxon";
import { execSync } from 'child_process';
import { isEmpty } from 'lodash'

import { createInvoice } from "./createInvoice";
import { createPayment } from "./createPayment";

import type { Order, ProcessedData } from "./types";
import dayjs from "dayjs";
import {creditCardCutOffDate} from "./config";
import * as process from "node:process";

/**
 * Execute
 */

const ordersString = fs.readFileSync("input/orders.csv");
const orders = parse(ordersString, { columns: true });

const ordersWithTaxString = fs.readFileSync("input/orders-tax.csv");
const ordersWithTaxArray = parse(ordersWithTaxString, { columns: true });
// @ts-ignore
const ordersWithTaxMap = ordersWithTaxArray.reduce((prev, cur) => {
  prev[cur["Order Number"]] = cur;
  return prev;
}, {});

const orderWithEmail: Record<string, string> = parse(fs.readFileSync("input/event-orders.csv"), { columns: true })
    // @ts-ignore
    .reduce((prev, cur) => {
        prev[cur["Order #"]] = cur["Email"]
        return prev
    }, {})

// // 1. clean up data
const processedData: ProcessedData[] = (orders as Order[])
    // filter subtotal 0 away
    .filter(o => Number(o['Subtotal']) > 0)
    // beautify data
    .map(item => {
        const taxInfo = ordersWithTaxMap[item["Order #"]]

        return {
            eventpopId: item['Order #'],
            customer: {
                name: taxInfo?.["Billing Name"] ?? item["Buyer Name"],
                taxId: taxInfo?.["Billing Tax ID"] ?? null,
                address: taxInfo?.["Billing Address"] ?? null,
                branch: taxInfo?.["Billing Branch"] ?? 'สำนักงานใหญ่',
                email: orderWithEmail[item['Order #']]
            },
            ticket: {
                type: item["Ticket Type"],
                amount: Number(item["Amount"]),
                price: Number(item["Subtotal"])
            },
            payment: {
                method: item["Payment Method"] === "Bank transfer" ? 'bank' : 'credit',
                when: new Date(DateTime.fromFormat(
                    item["Paid At"],
                    "dd/MM/yyyy - HH:mm",
                    {
                        zone: 'Asia/Bangkok',
                        setZone: true,
                    }
                ).toISO()!).toISOString(),
                witholdingTax: Number(item["Withholding Tax"]) > 0 ? Number(item["Withholding Tax"]) : null
            },
        } satisfies ProcessedData
    })

fs.writeFileSync("output/processedData.json", JSON.stringify(processedData, null, 2))

// const pickedData = [processedData[0]]
// const pickedData = processedData
const pickedData = processedData
.filter(o => 
    [
        "#38704-3216014", // credit, tax, withholding
        "#38704-3215164", // bank, tax, withholding
        "#38704-3215100", // credit, tax
        "#38704-3267295", // bank, tax
        "#38704-3225968", // credit
        "#38704-3215101", // bank,
        "#38704-3288940", // out of scope,
        "#38704-3251019", // company
        "#38704-3215560"   // company

    ].includes(o.eventpopId)
)

;(async () => {
    let index = 1
    for await (const item of pickedData) {
        try {
            // 2. create invoice
            const invoice = await createInvoice(item, index)

            // 3. create payment record
            //   3.1. bank transfer
            //   3.2. credit card

            // skip create payment if payment is credit and outside cut off date
            if (item.payment.method === 'bank' || dayjs(item.payment.when).isBefore(dayjs(creditCardCutOffDate)))
                await createPayment(item, invoice.recordId)
            else
                console.log('payment:igno: ', item.eventpopId)
        } catch (e) {
            console.error('fail: ', item.eventpopId)
            console.error(e)
            execSync(`echo "${item.eventpopId}" >> output/failed.txt`, {
                cwd: process.cwd()
            })
        } finally {
            index++
        }
    }
})()