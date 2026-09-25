import HelloAction from "../HelloAction";
import { jest } from '@jest/globals';
import { DateTime } from "luxon";
describe("HelloAction", () => {
  test("action get called", async () => {
    const mockAction = {};
    const mockUserInfo = {
        id: 1,
        name: "John Doe",
        username: "john.doe",
        email: "john.doe@example.com",    
        phone: "1234567890",
        fitbitId: "1234567890",
        activateAt: "2021-01-01T00:00:00Z",
        completeAt: "2021-01-30T00:00:00Z",
      };

    // check that console.log get called
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    const actionResult = await HelloAction.execute(mockAction, {
      userInfo: mockUserInfo,
      datetime: DateTime.fromISO("2021-01-01T00:00:00Z"),
    });

    expect(mockConsoleLog).toHaveBeenCalledWith("Hello, john.doe!");

    expect(actionResult).toEqual({
      type: "console",
      value: "hello",
    });
  });
});
