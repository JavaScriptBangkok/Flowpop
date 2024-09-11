import 'dotenv/config'

import { parse } from "csv-parse/sync";
import fs from "fs";
import { DateTime } from "luxon";
import { execSync } from 'child_process';

import { createInvoice } from "./createInvoice";
import { pay } from "./pay";

import type { Order, ProcessedData } from "./types";
import {isExecuted} from "./isExecuted";
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
                name: item["Buyer Name"],
                taxId: taxInfo?.["Billing Tax ID"] ?? null,
                address: taxInfo?.["Billing Address"] ?? null,
                branch: 'สำนักงานใหญ่',
                email: orderWithEmail[item['Order #']]
            },
            ticket: {
                type: item["Ticket Type"],
                amount: Number(item["Amount"]),
                price: Number(item["Subtotal"])
            },
            payment: {
                method: item["Payment Method"] === "Bank transfer" ? 'bank' : 'credit',
                when: DateTime.fromFormat(
                    item["Paid At"],
                    "dd/MM/yyyy - HH:mm",
                    {
                        zone: 'Asia/Bangkok',
                        setZone: true,
                    }
                ).toISO()!
            },
            isWitholdingTax: Number(item["Withholding Tax"]) > 0
        } satisfies ProcessedData
    })
   // filter out credit card order that beyond cutoff date
    .filter(o => {
        return o.payment.method === 'bank' || dayjs(o.payment.when).isBefore(dayjs(creditCardCutOffDate))
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
        "#38704-3215101", // bank

    ].includes(o.eventpopId)
)

;(async () => {
    let index = 1
    for await (const item of pickedData) {
        try {
            if (isExecuted(item.eventpopId)) {
                console.log('skip: ', item.eventpopId)
            } else {
                // 2. create invoice
                const invoice = await createInvoice(item, index)

                // 3. create payment record
                //   3.1. bank transfer
                //   3.2. credit card
                const paymentConfirmation = await pay(item, invoice.data.recordId)

                console.log('done: ', item.eventpopId, invoice.data.documentSerial)
                execSync(`echo "${item.eventpopId} ${invoice.data.recordId} ${invoice.data.documentSerial}" >> output/success.txt`, {
                    cwd: process.cwd()
                })
            }
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