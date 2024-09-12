import chalk from 'chalk'

export const logger = (type: 'invoice' | 'payment', status: 'done' | 'skip' | 'igno' | 'fail', ...data: any[]) => {
    const title = `${type}:${status}: `
    switch (status) {
        case "done":
            console.log(chalk.green(title), ...data)
            break
        case "fail":
            console.error(chalk.red(title), ...data)
            break
        case "skip":
            console.log(chalk.yellow(title), ...data)
            break
        case "igno":
            console.log(chalk.blue(title), ...data)
            break
    }
}
