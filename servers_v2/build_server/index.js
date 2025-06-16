const {exec} = require('child_process')
const path = require('path')
const fs = require('fs')
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')
const mime = require('mime-types')
const Redis = require('ioredis')
// const {Kafka} = require('kafkajs')

const client = new S3Client({
    region: 'eu-north-1',
    credentials: {
        accessKeyId: 'AKIAQYEI5BHXVE5G6447',
        secretAccessKey: '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'
    }
})

const publisher = new Redis('rediss://default:AVNS_ENXlC6iqpu02dbPwMvy@valkey-18e51184-tuhinbanerjee0231-4f38.b.aivencloud.com:25150')

const PROJECT_ID = process.env.PROJECT_ID


function publishLog(log) {
    publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({log}))
}

// const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID

// const kafka = new Kafka({
//     clientId: `docker-build-server-${DEPLOYMENT_ID}`,
//     brokers:['kafka-1fda478f-tuhinbanerjee0231-4f38.l.aivencloud.com:25162'],
//     ssl: {
//         ca: [fs.readFileSync(path.join(__dirname, 'kafka.pem'), 'utf-8')]
//     },
//     sasl: {
//         username: 'avnadmin',
//         password: 'AVNS_-D4veAk3ctSa8fQoYyy',
//         mechanism: 'plain'
//     },
// })

// const producer = kafka.producer()

// async function publishLog(log) {
//     await producer.send({topic: `container-logs`, messages: [{key: 'log', value: JSON.stringify({PROJECT_ID, DEPLOYMENT_ID, log})}]})
// }

async function init() {
    // await producer.connect()

    console.log('Running index.js')

    publishLog('Build Started...')
    const outDirPath = path.join(__dirname, 'output')

    const shell= exec(`cd ${outDirPath} && npm install && npm run build`)

    shell.stdout.on('data', function (data) {
        console.log('Success: ', data.toString())
        publishLog(data.toString())
    })

    shell.stdout.on('error', function (data) {
        console.log('Error: ', data.toString())
        publishLog(data.toString())
    })

    shell.on('close', async function() {
        console.log('Build Complete')

        publishLog('Build Complete...')
        const distFolderPath = path.join(__dirname, 'output', 'dist')
        const distFolderContent = fs.readdirSync(distFolderPath, {recursive: true})

        publishLog('Upload Started...')
        for (const file of distFolderContent) {
            const filePath = path.join(distFolderPath, file)
            if(fs.lstatSync(filePath).isDirectory()) continue;

            console.log("Uploading: ", filePath);
            publishLog(`Uploading ${file}`)

            const command = new PutObjectCommand({
                Bucket: 'deploycell',
                Key: `__output/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            })

            await client.send(command)
            console.log("Uploaded: ", filePath);
            publishLog(`Uploaded ${file}`)
        }

        console.log("DONE......")
        publishLog(`DONE...`)

        process.exit(0)
    })
}

init()