export interface Order {
    'Order #': string,
    'Paid At': string,
    'Buyer Name': string,
    'Payment Method': string,
    'Order Status': string,
    'Partner Sale Channel': string,
    'Ticket Type': string,
    'Unit Price': string,
    Amount: string,
    Discount: string,
    Subtotal: string,
    'Order Subtotal (Incl. VAT)': string,
    'Withholding Tax': string,
    'Refundable Tickets Fee': string,
    'Refundable Tickets Fee (VAT)': string,
    'Delivery Fee': string,
    'Delivery Fee (VAT)': string,
    'Payment Handling Fee': string,
    'Payment Handling Fee (VAT)': string,
    'Total Customer Fee': string,
    'Grand Total (Customer)': string,
    'Complimentary Ticket Fee': string,
    'Complimentary Ticket Fee (VAT)': string,
    'Total Organizer Fee': string,
    'Refund Amount': string,
    'Organizer Refund Amount': string,
    'Pending Dispute Amount': string,
    'Organizer Revenue Fees Amount': string,
    'Order Revenue (Before Refund)': string,
    'Order Revenue': string,
    'Bank Transfer Attachment': string,
    'Refund Requested At': string,
    City: string,
    Country: string,
    'Discount Code Used': string,
    Phone: string,
    'Phone Country': string,
  }

  export interface ProcessedData {
    eventpopId: string
    ticket: {
        type: string // General, General Corporate, Early Bird, Early Brid Corporat4e
        amount: number
        price: number
    }
    payment: {
        method: 'bank' | 'credit'
        when: string // ISO timestamp
    }
    customer: {
        name: string
        taxId: string | null
        address: string | null
        branch: string
    }
    isWitholdingTax: boolean
}