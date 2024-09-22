import 'dotenv/config';

import { parse } from "csv-parse/sync";
import fs from "fs";
import isEmpty from 'lodash/isEmpty';
import { DateTime } from "luxon";

import type { Order, ProcessedData } from "./types";

interface TaxInfo {
  billingName: string;
  billingTaxId: string;
  billingAddress: string;
  billingBranch: string;
}

function convertToTaxInfo(csvRow: any): TaxInfo {
  return {
    billingName: csvRow["Billing Name"] || "",
    billingTaxId: csvRow["Billing Tax ID"] || "",
    billingAddress: csvRow["Billing Address"] || "",
    billingBranch: csvRow["Billing Branch"] || "",
  };
}

export const getData = () => {
    /**
     * Execute
     */

    const ordersString = fs.readFileSync("input/orders.csv");
    const orders = parse(ordersString, { columns: true });

    const taxInfoMap: Record<string, TaxInfo> = {};
    const ordersWithTaxString = fs.readFileSync("input/orders-tax.csv");
    const ordersWithTaxArray = parse(ordersWithTaxString, { columns: true });
    for (const order of ordersWithTaxArray) {
        taxInfoMap[order["Order Number"]] = convertToTaxInfo(order);
    }

    const attendeesString = fs.readFileSync("input/attendees.csv");
    const attendeesArray = parse(attendeesString, { columns: true });
    for (const ticket of attendeesArray) {
        const orderNumber = ticket['Order number'];
        const billingName = ticket['Company or individual name for tax invoice'];
        const billingBranch = ticket['Branch name for tax invoice (optional)'];
        const billingTaxId = ticket['Tax id or citizen id for tax invoice'];
        const billingAddress = ticket['Company or individual address for tax invoice'];
        if (billingName || billingBranch || billingTaxId || billingAddress) {
            taxInfoMap[orderNumber] = {
                billingName: billingName || "",
                billingBranch: billingBranch || "",
                billingTaxId: billingTaxId || "",
                billingAddress: billingAddress || "",
            };
        }
    }

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
            const taxInfo = taxInfoMap[item["Order #"]];

            return {
                eventpopId: item['Order #'],
                customer: {
                    name: !isEmpty(taxInfo?.billingName) ? taxInfo.billingName : item["Buyer Name"],
                    taxId: taxInfo?.billingTaxId ?? null,
                    address: taxInfo?.billingAddress ?? null,
                    branch: taxInfo?.billingBranch ?? '',
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