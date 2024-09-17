import fs from 'fs'

export const isExecuted = (type: string, eventpopOrderId: string) => {
    try {
        return fs
            .readFileSync(`output/${type}.txt`, 'utf-8').trim()
            .split('\n')
            .map(line => line.split(' '))
            .find(line => line[0] === eventpopOrderId)
    } catch (e) {
        return undefined
    }
}