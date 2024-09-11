import fs from 'fs'

export const isExecuted = (eventpopOrderId: string) => {
    try {
        const executedIds = fs
            .readFileSync('output/success.txt', 'utf-8').trim()
            .split('\n')
            .map(line => line.split(' ')[0])

        return executedIds.includes(eventpopOrderId)
    } catch (e) {
        return false
    }
}