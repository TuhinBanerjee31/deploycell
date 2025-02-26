
# DeployCell

DeployCell is a powerful tool designed to make the process of hosting and serving web applications easier and more efficient, even for developers with minimal experience in server management  
**Disclaimer:** No live link is put to avoid object storage charges.

## Installation

- Ensure you have Node.js, npm and typescript installed on your machine.

- Clone the repository and add to your local environment.

- Install the required dependencies.

```bash
  cd servers
  cd upload_server
  npm install
  cd ..
  cd deploy_server
  npm install
  cd ..
  cd request_handler_server
  npm install
```

## Environment Variables

Create a [Cloud Flare](https://developers.cloudflare.com/r2/) account and get your S3 bucket ready because to run this project, you will need to add the following environment variables to your .env file inside all the servers folder.

`R2_KEYID=`
`R2_SECERT=`
`R2_ENDPOINT=`
`R2_TOKEN=` 


## Deployment

To deploy this project run:
- Start [Redis](https://developer.redis.com/create/windows/) locally.
- Run all the backend servers locally.
- Upload Server:
```bash
  cd servers
  cd upload_server
  tsc --build
  nodemon dist/index.js
```

- Deploy Server:
```bash
  cd servers
  cd deploy_server
  tsc --build
  nodemon dist/index.js
```

- Request-handler Server:
```bash
  cd servers
  cd request_handler_server
  tsc --build
  nodemon dist/index.js
```
- Start the frontend using Go-Live server.
## Demo

![Demo](https://s3.gifyu.com/images/bS1md.gif)


## Workflow Diagram

![Diagram](https://i.imghippo.com/files/WhZT7430xDc.png)


## Tech Stack

**Client:** HTML, CSS, Javascript, Three.js 

**Server:** Node, Express, Typescript, RedisDB


## Optimization Plans

- Containerise using Docker
- Upgrading database to postgresSQL
- Modifying UI and converting to React
- Implementing EC2 Instances powered by AWS Fargate Kubernetes for running the final build pipeline and auto scale it.
- Migrating the Object Storage.



