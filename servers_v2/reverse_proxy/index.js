require('dotenv').config()
const express = require('express')
const httpProxy = require('http-proxy')

const app = express()
const port = process.env.PORT || 8000

const BASE_PATH = process.env.AWS_BASE_PATH;

const proxy = httpProxy.createProxy()

app.use((req, res) => {
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];
    console.log(subdomain)

    // Custom Domain - DB Query

    const resolvesTo = `${BASE_PATH}/${subdomain}`

    return proxy.web(req, res, { target: resolvesTo, changeOrigin: true, secure: false })

})

proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url;
    if (url === '/')
        proxyReq.path += 'index.html'

})

app.listen(port, () => console.log(`Reverse Proxy Running..${port}`))