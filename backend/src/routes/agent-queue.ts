
import { Router } from "express";
import { agentQueue } from "../services/queue-service.js";

const router = Router();

// POST /api/queue/enqueue - Add task
router.post("/enqueue", async (req, res) => {
  try {
    const task = req.body;
    if (!task) {
      return res.status(400).json({ error: "Task body required" });
    }

    const length = await agentQueue.enqueue(task);
    res.json({ success: true, queueLength: length });
  } catch (error) {
    res.status(500).json({ error: "Failed to enqueue task" });
  }
});

// POST /api/queue/dequeue - Get next task
router.post("/dequeue", async (req, res) => {
  try {
    const task = await agentQueue.dequeue();
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: "Failed to dequeue task" });
  }
});

// GET /api/queue/length
router.get("/length", async (req, res) => {
  try {
    const length = await agentQueue.length();
    res.json({ length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get queue length" });
  }
});

// GET /api/queue/peek
router.get("/peek", async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || 10;
    const tasks = await agentQueue.peek(count);
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: "Failed to peek queue" });
  }
});

export default router;
