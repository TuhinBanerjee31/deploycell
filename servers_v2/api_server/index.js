require("dotenv").config();
const express = require("express");
const generateSlug = require("unique-slug");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const cors = require("cors");
const Redis = require("ioredis");
const { Server } = require("socket.io");
const { z } = require("zod");

const app = express();
app.use(express.json());
app.use(cors());
const PORT = 9000;

const subscriber = new Redis(process.env.REDIS_URL);
const io = new Server({ cors: "*" });

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
});

io.listen(9001, () => console.log("Socket Server running on 9001"));

const config = {
  CLUSTER: process.env.CLUSTER_ARN,
  TASK: process.env.TASK_ARN,
};

const ecsClient = new ECSClient({
  region: "eu-north-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_KEY,
  },
});

// const consumer = kafka.consumer({ groupId: "api-server-logs-consumer" });

// app.post("/project", async (req, res) => {
//   const objSchema = z.object({
//     name: z.string(),
//     gitURL: z.string(),
//   });

//   const safeParseResult = objSchema.safeParse(req.body);

//   if (safeParseResult.error)
//     return res.status(400).json({ error: safeParseResult.error });

//   const { name, gitURL } = safeParseResult.data;

//   const newProject = await prisma.project.create({
//     data: {
//       name,
//       gitURL,
//       subDomain: generateSlug(),
//     },
//   });

//   return res.json({ status: "success", data: { newProject } });
// });

// app.post("/deploy", async (req, res) => {
//   const { projectId } = req.body;

//   const project = await prisma.project.findUnique({ where: { id: projectId } });

//   if (!project) return res.status(404).json({ error: "Project Not Found" });

//   //   const running_deployment = await prisma.deployment.findUnique

//   const newDeployment = await prisma.deployment.create({
//     data: {
//       project: { connect: { id: projectId } },
//       status: "INITIATED",
//     },
//   });

//   // Spin the container
//   const command = new RunTaskCommand({
//     cluster: config.CLUSTER,
//     taskDefinition: config.TASK,
//     launchType: "FARGATE",
//     count: 1,
//     networkConfiguration: {
//       awsvpcConfiguration: {
//         assignPublicIp: "ENABLED",
//         subnets: [
//           process.env.SUBNET1,
//           process.env.SUBNET2,
//           process.env.SUBNET3,
//         ],
//         securityGroups: [process.env.SECURITY_KEY],
//       },
//     },
//     overrides: {
//       containerOverrides: [
//         {
//           name: "builder-image",
//           environment: [
//             { name: "GIT_REPO_URL", value: project.gitURL },
//             { name: "PROJECT_ID", value: projectId },
//             { name: "DEPLOYMENT_ID", value: newDeployment.id },
//           ],
//         },
//       ],
//     },
//   });

//   await ecsClient.send(command);

//   return res.json({
//     status: "INITIATED",
//     data: { deploymentId: newDeployment.id },
//   });
// });

app.post("/direct", async (req, res) => {
  const { gitURL } = req.body;
  const projectSlug = generateSlug();

  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: [
          process.env.SUBNET1,
          process.env.SUBNET2,
          process.env.SUBNET3,
        ],
        securityGroups: [process.env.SECURITY_KEY],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder-image",
          environment: [
            { name: "GIT_REPO_URL", value: gitURL },
            { name: "PROJECT_ID", value: projectSlug },
            { name: "REDIS_URL", value: process.env.REDIS_URL },
            { name: "ACCESS_KEY_ID", value: process.env.ACCESS_KEY_ID },
            { name: "SECRET_KEY", value: process.env.SECRET_KEY }
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);

  return res.json({
    data: { projectSlug, url: `http://${projectSlug}.${process.env.SERVE_URL}` },
  });
});

async function initkafkaConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topics: ["container-logs"], fromBeginning: true });

  await consumer.run({
    eachBatch: async function ({
      batch,
      heartbeat,
      commitOffsetsIfNecessary,
      resolveOffset,
    }) {
      const messages = batch.messages;
      console.log(`Recv. ${messages.length} messages..`);

      for (const message of messages) {
        if (!message.value) continue;

        const stringMessage = message.value.toString();
        const { PROJECT_ID, DEPLOYMENT_ID, log } = JSON.parse(stringMessage);
        console.log({ log, DEPLOYMENT_ID });

        try {
          const { query_id } = await clickhouseClient.insert({
            table: "log_events",
            values: [{ event_id: uuidv4(), deployment_id: DEPLOYMENT_ID, log }],
            format: "JSONEachRow",
          });
          console.log(query_id);
          resolveOffset(message.offset);
          await commitOffsetsIfNecessary(message.offset);
          await heartbeat();
        } catch (error) {
          console.log(error);
        }
      }
    },
  });
}

async function initRedisSubscribe() {
  subscriber.psubscribe('logs:*')
  subscriber.on('pmessage', (pattern, channel, message) => {
    io.to(channel).emit('message', message)
  })
}

initRedisSubscribe()

// initkafkaConsumer();

app.listen(PORT, () => console.log(`API Server Running..${PORT}`));
