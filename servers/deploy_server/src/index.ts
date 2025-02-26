import { createClient, commandOptions } from "redis";
import { downloadS3Folder, buildProject, copyFinalDist } from "./utils";
const subscriber = createClient();
subscriber.connect();

const publisher = createClient();
publisher.connect();

async function main() {
  while (true) {
    try {
      const res = await subscriber.brPop(
        commandOptions({ isolated: true }),
        "build-queue",
        0
      );

      // @ts-ignore;
      const id = res.element;

      console.log(`Processing ID: ${id}`);

      await downloadS3Folder(`output/${id}`);
      console.log(`Files downloaded for ID: ${id}`);

      await buildProject(id);
      console.log(`Build completed for ID: ${id}`);

      copyFinalDist(id);
      publisher.hSet("status", id,"deployed")
      console.log(`Files uploaded for ID: ${id}`);
    } catch (error) {
      console.error("An error occurred during processing:", error);
    }
  }
}

main();
