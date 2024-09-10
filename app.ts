import 'dotenv/config'

import { parse } from "csv-parse/sync";
import fs from "fs";
import { DateTime } from "luxon";

import { createInvoice } from "./createInvoice";
import { pay } from "./pay";

import type { Order, ProcessedData } from "./types";

const ordersString = fs.readFileSync("input/orders.csv");
const orders = parse(ordersString, { columns: true });

const ordersWithTaxString = fs.readFileSync("input/orders-tax.csv");
const ordersWithTaxArray = parse(ordersWithTaxString, { columns: true });
// @ts-ignore
const ordersWithTaxMap = ordersWithTaxArray.reduce((prev, cur) => {
  prev[cur["Order Number"]] = cur;
  return prev;
}, {});

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
                    "dd/MM/yyyy - HH:mm"
                ).toISO()!
            },
            isWitholdingTax: Number(item["Withholding Tax"]) > 0
        }
    })


fs.writeFileSync("output/processedData.json", JSON.stringify(processedData, null, 2))

// const pickedData = [processedData[0]]
// const pickedData = processedData
const pickedData = processedData
.filter(o => 
    [
        "#38704-3216014",
        "#38704-3267295",
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
            // const paymentConfirmation = await pay(item, invoice.data.recordId)
        } catch (e) {
            console.error(e)
        } finally {
            index++
        }
    }
})()