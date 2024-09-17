import 'dotenv/config'

import { parse } from "csv-parse/sync";
import fs from "fs";
import { DateTime } from "luxon";
import isEmpty from 'lodash/isEmpty'

import type { Order, ProcessedData } from "./types";

export const getData = () => {
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
                    name: !isEmpty(taxInfo?.["Billing Name"]) ? taxInfo?.["Billing Name"] : item["Buyer Name"],
                    taxId: taxInfo?.["Billing Tax ID"] ?? null,
                    address: taxInfo?.["Billing Address"] ?? null,
                    branch: taxInfo?.["Billing Branch"] ?? '',
                    email: orderWithEmail[item['Order #']]
                },
                ticket: {
                    type: item["Ticket Type"],
                    amount: Number(item["Amount"]),
                    price: Number(item["Unit Price"])
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

    return processedData
}