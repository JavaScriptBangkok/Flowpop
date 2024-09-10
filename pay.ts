import dayjs from "dayjs";
import { headers } from "./constants";
import { ProcessedData } from "./types";

export const pay = (data: ProcessedData, recordId: number) => {
    const raw = JSON.stringify({
        "dateNow": dayjs().toISOString(),
        "chequeDate": data.payment.when,
        "withholdingTax": data.isWitholdingTax ? 3 : null,
        "amountWithheld": 0,
        "charge": 0,
        "paymentMethod": data.payment.method === "bank" ? 5 : 13,
        "autoCreateWithholdingTax": true,
        "exchangeRateFee": 0,
        "documentId": recordId,
        "remainingCollected": 0,
        "deductionAmount": 0,
        "paymentDeductionType": 0,
        "withholdingTaxIncomeType": 27,
        "withholdingTaxEntity": 3,
        "chequeNumber": "",
        "chequeDepositDate": null,
        "chequeDepositBankId": null,
        "chequeCashingDate": null,
        "amountCollected": data.ticket.price * data.ticket.amount,
        "remarks": null,
        "remainingCollectedType": 0,
        "otherChannelId": 42825,
        "otherChannelPaymentChannel": 3,
        "otherChannelName": "Eventpop"
    });

    const requestOptions = {
    method: "POST",
    headers: headers,
    body: raw,
    };

    return fetch("https://api-core-canary.flowaccount.com/api/th/tax-invoices/"+ recordId +"/payments", requestOptions)
        .then((response) => {
            console.log(response.status)
            return response.json()
        })
}