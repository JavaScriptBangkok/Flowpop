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

function convertOrderRowToTaxInfo(csvRow: any): TaxInfo {
    return {
        billingName: csvRow["Billing Name"] || "",
        billingTaxId: csvRow["Billing Tax ID"] || "",
        billingAddress: csvRow["Billing Address"] || "",
        billingBranch: csvRow["Billing Branch"] || "",
    };
}

function convertTicketRowToTaxInfo(ticket: any): TaxInfo {
    return {
        billingName: ticket['Company or individual name for tax invoice'] || "",
        billingBranch: ticket['Branch name for tax invoice (optional)'] || "",
        billingTaxId: ticket['Tax id or citizen id for tax invoice'] || "",
        billingAddress: ticket['Company or individual address for tax invoice'] || "",
    };
}

function isTaxInfoEmpty(taxInfo: TaxInfo): boolean {
    return (
        isEmpty(taxInfo.billingName) &&
        isEmpty(taxInfo.billingTaxId) &&
        isEmpty(taxInfo.billingAddress) &&
        isEmpty(taxInfo.billingBranch)
    );
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
        const taxInfo = convertOrderRowToTaxInfo(order);
        if (!isTaxInfoEmpty(taxInfo)) {
            taxInfoMap[order["Order Number"]] = taxInfo;
        }
    }

    const attendeesString = fs.readFileSync("input/attendees.csv");
    const attendeesArray = parse(attendeesString, { columns: true });
    for (const ticket of attendeesArray) {
        const orderNumber = ticket['Order number'];
        const taxInfo = convertTicketRowToTaxInfo(ticket);
        if (!taxInfoMap[orderNumber] && !isTaxInfoEmpty(taxInfo)) {
            taxInfoMap[orderNumber] = taxInfo;
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