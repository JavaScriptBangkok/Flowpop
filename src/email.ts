import fs from 'fs'
import path from 'path'
import {getData} from "./functions/getData";
import {logger} from "./functions/logger";
import {headers} from "./functions/constants";
import {execSync} from "child_process";
import process from "node:process";
import {isExecuted} from "./functions/isExecuted";

const processedData = getData()
const completedPaymentOrders = fs.readFileSync(
    path.join(
        process.cwd(),
        'output',
        'payment.txt'
    ),
    'utf8'
).trim().split("\n")
const invoices = fs.readFileSync("output/invoice.txt", "utf8").trim().split("\n").map(line => {
    const [eventpopOrderId, recordId, documentSerial] = line.split(" ")

    return {
        eventpopOrderId,
        recordId,
        documentSerial
    }
});

const paymentOrders = processedData
    // get only order that completed payment
    .filter(data => completedPaymentOrders.includes(data.eventpopId))
    // get only order that has invoice
    .filter(data => data.customer.taxId !== null)
    // get only Corporate Ticket
    .filter(data => data.ticket.type.toLowerCase().includes('corporate ticket'))
    // get tickets that's not corporate ticket
    // .filter(data => !data.ticket.type.toLowerCase().includes('corporate ticket'))
    // .filter(data => [
    //     "#38704-3215102",
    // ].includes(data.eventpopId))

// console.log(paymentOrders.length)

// paymentOrders.forEach(order => console.log(`${order.eventpopId} ${order.ticket.type}`))

// process.exit(0)

;(async () => {
    for await (const order of paymentOrders) {
        // create receipt api
        // data.link

        // find created documentSerial and details
        const invoice = invoices.find(i => i.eventpopOrderId === order.eventpopId)
        if (invoice !== undefined) {
            if (isExecuted('email', order.eventpopId)) {
                logger('receipt', 'skip', order.eventpopId)
            } else {
                // create receipt doc-api
                interface ShareDocument {
                    data: {
                        link: string
                    }
                }
                const shareDocument = await fetch("https://doc-api-canary.flowaccount.com/api/taxInvoice/sharedocument", {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        culture: "th",
                        documentId: Number(invoice.recordId),
                        documentType: 7,
                        urlPrefix: "taxInvoice",
                    })
                }).then(o => {
                    console.log(o.status)
                    return o.json() as Promise<ShareDocument>
                })

                await fetch("https://doc-api-canary.flowaccount.com/api/taxInvoice/EmailDocument", {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        Invoice: false,
                        InvoiceCopy: false,
                        IsIncludePaymentDetail: false,
                        Sharelink: shareDocument.data.link,
                        TaxInvoice: true,
                        TaxInvoiceCopy: true,
                        cCMyself: true,
                        culture: "th",
                        documentId: Number(invoice.recordId),
                        documentType: 7,
                        fromemail: "javascriptbangkok@gmail.com",
                        message: `เรียน ${order.customer.name}<br><br>บริษัท ชุมชนนักพัฒนาซอฟต์แวร์ จำกัด ได้แนบเอกสาร เลขที่ ${invoice.documentSerial} มาให้ในอีเมลนี้ กรุณาคลิกที่ไฟล์แนบ เพื่อดาวน์โหลดหรือพิมพ์เอกสารของคุณ<br><br>ด้วยความเคารพ<br>ปัญจมพงศ์ เสริมสวัสดิ์ศรี<br>บริษัท ชุมชนนักพัฒนาซอฟต์แวร์ จำกัด`,
                        subject: `เอกสารเลขที่ ${invoice.documentSerial} จาก บริษัท ชุมชนนักพัฒนาซอฟต์แวร์ จำกัด`,
                        // toemail: "rayriffy@gmail.com",
                        toemail: order.customer.email,
                        urlPrefix: "taxInvoice"
                    })
                }).then(o => {
                    console.log(o.status)
                    return o.json()
                })

                logger('receipt', 'done', order.eventpopId, shareDocument.data.link)

                execSync(`echo "${order.eventpopId} ${shareDocument.data.link} ${order.customer.email}" >> output/email.txt`, {
                    cwd: process.cwd()
                })
            }
        } else {
            logger('receipt', 'igno', order.eventpopId)
        }
    }
})()
