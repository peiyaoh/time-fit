import ActivateParticipantAction from "../ActivateParticipantAction";
import { jest } from '@jest/globals';
import { DateTime } from "luxon";

// TO DO: incomplete
describe("ActivateParticipantAction.test", () => {
  test("action get called", async () => {
    const mockAction = {
        phase: "intervention",
    };

    const mockUserInfo = {
        id: 1,
        name: "John Doe",
        username: "john.doe",
        email: "john.doe@example.com",    
        phone: "1234567890",
        fitbitId: "1234567890",
        activateAt: "2021-01-01T00:00:00Z",
        completeAt: "2021-01-30T00:00:00Z",
        phase: "baseline",
      };

    expect(mockUserInfo.phase).toBe("baseline");

    /*
    // check that console.log get called
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    const actionResult = await ActivateParticipantAction.execute(mockAction, {
      userInfo: mockUserInfo,
      datetime: DateTime.fromISO("2021-01-01T00:00:00Z"),
    });

    expect(mockConsoleLog).not.toHaveBeenCalled();

    expect(actionResult).toEqual({
      type: "activate-participant",
      value: {
        status: "success",
        errorMessage: "",
        body: {
            phase: "intervention",
        },
      },
    });
    */
  });
});
