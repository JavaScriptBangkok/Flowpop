import 'dotenv/config'

import { execSync } from 'child_process';
import { createInvoice } from "./functions/createInvoice";
import { createPayment } from "./functions/createPayment";
import dayjs from "dayjs";
import {creditCardCutOffDate} from "./functions/config";
import * as process from "node:process";
import {logger} from "./functions/logger";
import {getData} from "./functions/getData";

/**
 * Execute
 */

const processedData = getData()

const pickedData = processedData
    // .filter(o =>
    //     [
    //         // "#38704-3216014", // credit, tax, withholding
    //         // "#38704-3215164", // bank, tax, withholding
    //         // "#38704-3215100", // credit, tax
    //         // "#38704-3267295", // bank, tax
    //         // "#38704-3225968", // credit
    //         // "#38704-3215101", // bank,
    //         // "#38704-3288940", // out of scope,
    //         // "#38704-3251019", // company
    //         // "#38704-3215560"   // company
    //         "#38704-3244162"
    //
    //     ].includes(o.eventpopId)
    // )


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
                logger('payment', 'igno', item.eventpopId)
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