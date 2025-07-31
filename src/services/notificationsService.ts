import { sendNotification } from "@tauri-apps/plugin-notification";

export async function notify(title: string, body: string) {
  await sendNotification({ title, body });
}