import { describe, expect, it } from "vitest";
import { todoistClient } from "./todoist-client";

const isConfigured = todoistClient.isConfigured();

describe("TodoistClient - integração real", () => {
  it("deve refletir configuração atual", () => {
    expect(typeof isConfigured).toBe("boolean");
  });

  it.runIf(isConfigured)("deve criar, atualizar e concluir tarefa real", async () => {
    const projectName = `Teste Assistente Juridico ${Date.now()}`;
    const project = await todoistClient.createProject(projectName);

    const task = await todoistClient.addTask({
      content: "Tarefa de teste (integração real)",
      projectId: project.id,
    });

    const updated = await todoistClient.updateTask(task.id, {
      content: "Tarefa de teste (atualizada)",
    });

    await todoistClient.completeTask(task.id);
    await todoistClient.deleteTask(task.id);

    expect(project).toHaveProperty("id");
    expect(task).toHaveProperty("id");
    expect(updated).toHaveProperty("id");
  });
});
