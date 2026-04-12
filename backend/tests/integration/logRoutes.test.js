const router = require("../../routes/logs");
const logsController = require("../../controllers/logsController");

describe("logs routes", () => {
  test("registers GET / route with getLogs controller", () => {
    const routeLayer = router.stack.find(
      (layer) => layer.route && layer.route.path === "/" && layer.route.methods.get
    );

    expect(routeLayer).toBeDefined();
    expect(routeLayer.route.stack[0].handle).toBe(logsController.getLogs);
  });

  test("registers GET /stats route with getStats controller", () => {
    const routeLayer = router.stack.find(
      (layer) => layer.route && layer.route.path === "/stats" && layer.route.methods.get
    );

    expect(routeLayer).toBeDefined();
    expect(routeLayer.route.stack[0].handle).toBe(logsController.getStats);
  });

  test("registers GET /summary route with getSummary controller", () => {
    const routeLayer = router.stack.find(
      (layer) => layer.route && layer.route.path === "/summary" && layer.route.methods.get
    );

    expect(routeLayer).toBeDefined();
    expect(routeLayer.route.stack[0].handle).toBe(logsController.getSummary);
  });
});
