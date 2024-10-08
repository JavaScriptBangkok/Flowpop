import dayjs from 'dayjs'

import { type ProcessedData } from "./types";
import { headers } from './constants';
import {isExecuted} from "./isExecuted";
import {execSync} from "child_process";
import process from "node:process";
import {logger} from "./logger";

interface InvoiceResponse {
    recordId: number
    documentSerial: string
}

interface PartialResponse {
    data: InvoiceResponse
}

export const createInvoice = async (data: ProcessedData, index: number): Promise<InvoiceResponse> => {
    const cachedRecord = isExecuted('invoice', data.eventpopId)
    if (cachedRecord) {
        logger('invoice', 'skip', data.eventpopId)
        return {
            recordId: Number(cachedRecord[1]),
            documentSerial: cachedRecord[2],
        }
    }

    const total = Number((data.ticket.amount * data.ticket.price).toFixed(2));

    const preVat = Number((total * 100 / 107).toFixed(2));
    const vat = Number((total - preVat).toFixed(2));

    // const vat = Number((total * 0.07).toFixed(2));
    // const grandTotal = Number((total + vat).toFixed(2));

    const raw = JSON.stringify({
        "isComplieAccountingRule": false,
        "documentContactCompanyChangeType": 7,
        "isReCalculate": false,
        "documentType": 7,
        "recordId": 0,
        "contactId": 0,
        "contactName": data.customer.name,
        "contactAddress": data.customer.address ?? "",
        "contactAddressLine2": null,
        "contactAddressLine3": null,
        "contactOriginAddress": null,
        "contactNumber": "",
        "isForeignBase": false,
        "deductionAmount": 0,
        "documentDeductionType": 0,
        "paymentDeductionType": 0,
        "isReverseAccrual": false,
        "contactStateChange": false,
        "companyStateChange": false,
        "publishedOn": dayjs(data.payment.when).add(7, 'h').toISOString(),
        "dueDate": dayjs(data.payment.when).add(7, 'h').toISOString(),
        "discount": 0,
        "discountPercentage": 0,
        "creditDays": 0,
        "creditType": 3,
        "vatRate": 7,
        "isDicountAsPercentage": true,
        "productItems": [
            {
            "no": 0,
            "id": 53398209,
            "description": null,
            "name": data.ticket.type,
            "productDiscountTypes": 1,
            "quantity": data.ticket.amount,
            "vatRate": 7,
            "expenseCategoryId": 0,
            "expenseCategoryNameLocal": null,
            "expenseCategoryNameForeign": null,
            "expenseSystemCode": null,
            "expenseDebitId": 0,
            "expenseDebitCode": null,
            "expenseDebitNameLocal": null,
            "expenseDebitNameForeign": null,
            "expenseCreditId": 0,
            "expenseCreditCode": null,
            "expenseCreditNameLocal": null,
            "expenseCreditNameForeign": null,
            "discountPerItemValue": 0,
            "total": total,
            "pricePerUnit": data.ticket.price,
            "originalPrice": total,
            "originalPriceWithVat": total * 1.07,
            "productMasterId": 6291394,
            "type": 1,
            "multipleUnits": [],
            "isMultipleUnit": false,
            "originalType": 1,
            "productCode": "",
            "sellChartOfAccountId": 12768726,
            "buyChartOfAccountId": 0,
            "unitId": 0,
            "unitName": "",
            "isVat": false,
            "outOfScopeVat": false,
            "warehouseId": 51588,
            "discountPerItem": 0,
            "expenseDescription": "",
            "reverseAccrualDescription": ""
            }
        ],
        "status": 1,
        "tax": 0,
        "withHeld": 0,
        "isManualVat": false,
        "isWithholding": false, // Do at step 2
        "isBatchDocument": false,
        "documentDiscountTypes": 1,
        "useInlineDiscount": false,
        "useInlineVat": false,
        "useReceiptDeduction": true,
        "showSignatureOrStamp": true,
        "media": [],
        "withholdingTaxItems": [
            {
            "no": 1,
            "incomeType": 0,
            "taxRate": -2,
            "taxAmount": 0,
            "taxAmountNoVat": 0,
            "total": 0,
            "isVatInclusive": false,
            "vatType": 3,
            "description": null
            }
        ],
        "entity": 0,
        "textOther": "",
        "partialPaymentMethod": 1,
        "partialPercent": 0,
        "partialAmount": 0,
        "depositAmount": 0,
        "isDeposit": false,
        "isMigrate": false,
        "exchangeRateFee": 0,
        "isETaxEmailSent": false,
        "eTaxEmailStatus": 0,
        "eTaxEmailSendDate": null,
        "paymentDebitId": null,
        "isUpgradeFromCN": false,
        "depositDocumentType": 0,
        "salesId": 595333,
        "salesName": "ปัญจมพงศ์ เสริมสวัสดิ์ศรี",
        "expenseCategoryViewType": 1,
        "isVatInclusive": true,
        "isVat": true,
        "subTotal": total,
        "discountAmount": 0,
        "totalAfterDiscount": total,
        "vatValue": vat,
        "exemptAmount": 0,
        "vatableAmount": preVat,
        "grandTotal": total,
        "totalExcludingVat": preVat,
        "withholdingTaxAmount": 0,
        "paymentAmount": total,
        "grandTotalCurrency": null,
        "version": 2,
        "warehouseId": 51588,        
        "documentSerial": "INV" + dayjs().format("YYYYMM") + index.toString().padStart(4, '0'),
        "contactTaxId": data.customer.taxId,
        "contactZipCode": "",
        "contactBranch": data.customer.branch,
        "vatAmount": vat,
        "total": total,
        "reference": data.eventpopId,
        "internalNotes": data.customer.email,
    });

    const requestOptions = {
        method: "POST",
        headers: headers,
        body: raw,
    };

    const invoice = await fetch("https://api-core-canary.flowaccount.com/api/th/tax-invoices", requestOptions)
        .then((response) => {
            console.log(response.status)
            return response.json()
        })
        .then((result) => {
            return result as PartialResponse
        })

    logger('invoice', 'done', data.eventpopId)
    execSync(`echo "${data.eventpopId} ${invoice.data.recordId} ${invoice.data.documentSerial}" >> output/invoice.txt`, {
        cwd: process.cwd()
    })
    return {
        documentSerial: invoice.data.documentSerial,
        recordId: invoice.data.recordId,
    }
}
