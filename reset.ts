import 'dotenv/config'

import fs from 'fs'
import { headers } from './constants'

// POST https://api-core-canary.flowaccount.com/api/th/tax-invoices/54945441/status-key/void
// POST https://api-core-canary.flowaccount.com/api/th/tax-invoices/54945438/status-key/awaiting
// DELETE https://api-core-canary.flowaccount.com/api/th/tax-invoices/54945444

// read invoices file
const invoices = fs.readFileSync("output/invoice.txt", "utf8").trim().split("\n").map(line => {
    const [eventpopOrderId, recordId, documentSerial] = line.split(" ")

    return {
        eventpopOrderId,
        recordId,
        documentSerial
    }
});

;(async () => {
    for await (const invoice of invoices) {
        console.log(invoice.documentSerial)
        // void it
        await fetch(`https://api-core-canary.flowaccount.com/api/th/tax-invoices/${invoice.recordId}/status-key/void`, {
            method: 'POST',
            headers
        }).then(o => {
            console.log(o.status)
            return o
        })
        // reset it
        await fetch(`https://api-core-canary.flowaccount.com/api/th/tax-invoices/${invoice.recordId}/status-key/awaiting`, {
            method: 'POST',
            headers
        }).then(o => {
            console.log(o.status)
            return o
        })
        // delete it
        await fetch(`https://api-core-canary.flowaccount.com/api/th/tax-invoices/${invoice.recordId}`, {
            method: 'DELETE',
            headers
        }).then(o => {
            console.log(o.status)
            return o
        })
    }
})()
