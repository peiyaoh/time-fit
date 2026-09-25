import UserInfoCondition from "../UserInfoCondition";
import { DateTime } from "luxon";

describe('person info match', () => {
  test('property match', async () => {
    const mockUserInfo = {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "1234567890",
      address: "123 Main St, Anytown, USA",
      city: "Anytown",
      state: "CA",
    };

    const condition = {
      criteria: {
        name: "John Doe",
      },
    };

    const compositeResult = await UserInfoCondition.execute(condition, {
      userInfo: mockUserInfo,
      datetime: DateTime.now(),
    });

    expect(compositeResult.result).toBe(true);


  });
});

describe('person info not match', () => {
  test('property not match', async () => {
    const mockUserInfo = {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "1234567890",
      address: "123 Main St, Anytown, USA",
      city: "Anytown",
      state: "CA",
    };

    const condition = {
      criteria: {
        name: "Jane Doe",
      },
    };
    
    const compositeResult = await UserInfoCondition.execute(condition, {
      userInfo: mockUserInfo,
      datetime: DateTime.now(),
    });

    expect(compositeResult.result).toBe(false);
  });
});