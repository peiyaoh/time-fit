import NoAction from "../NoAction";
import { jest } from '@jest/globals';
import { DateTime } from "luxon";
describe("NoAction", () => {
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
    const actionResult = await NoAction.execute(mockAction, {
      userInfo: mockUserInfo,
      datetime: DateTime.fromISO("2021-01-01T00:00:00Z"),
    });

    expect(mockConsoleLog).not.toHaveBeenCalled();

    expect(actionResult).toEqual({
      type: "no-action",
      value: {
        status: "success",
        errorMessage: "",
        body: {},
      },
    });
  });
});
