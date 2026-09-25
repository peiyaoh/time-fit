import DateTimeHelper from "../DateTimeHelper";
import { DateTime } from "luxon";
describe('DateTimeHelper', () => {
  test('getLocalDateTime works', () => {
    const today = new Date();
    const result = DateTimeHelper.getLocalDateTime(DateTime.fromJSDate(today), "Asia/Tokyo");
    expect(result).toBeInstanceOf(DateTime);
    expect(result.zone.name).toBe("Asia/Tokyo");
    expect(result.valueOf()).toBe(today.valueOf());
  });

  test('diffDateTime works', () => {
    const today = new Date();
    const result = DateTimeHelper.diffDateTime(DateTime.fromJSDate(today), DateTime.fromJSDate(today), "days");
    expect(result.toObject()).toEqual({ days: 0 });

    const datetime2 = DateTime.fromJSDate(today).plus({ days: 1 });
    const result2 = DateTimeHelper.diffDateTime(DateTime.fromJSDate(today), datetime2, "days");
    expect(result2.toObject()).toEqual({ days: 1 });

    // add 1 hour
    const datetime3 = DateTime.fromJSDate(today).plus({ hours: 1 });
    const result3 = DateTimeHelper.diffDateTime(DateTime.fromJSDate(today), datetime3, "hours");
    expect(result3.toObject()).toEqual({ hours: 1 });

    // add 1 minute
    const datetime4 = DateTime.fromJSDate(today).plus({ minutes: 1 });
    const result4 = DateTimeHelper.diffDateTime(DateTime.fromJSDate(today), datetime4, "minutes");
    expect(result4.toObject()).toEqual({ minutes: 1 });

    // add 1 second
    const datetime5 = DateTime.fromJSDate(today).plus({ seconds: 1 });
    const result5 = DateTimeHelper.diffDateTime(DateTime.fromJSDate(today), datetime5, "seconds");
    expect(result5.toObject()).toEqual({ seconds: 1 });
    
    // add 2 minute and 30 seconds
    const datetime6 = DateTime.fromJSDate(today).plus({ minutes: 2, seconds: 30 });
    const result6 = DateTimeHelper.diffDateTime(DateTime.fromJSDate(today), datetime6, "seconds");
    expect(result6.toObject()).toEqual({ seconds: 150 });

    // add 1 hour and 2 minute and 30 seconds
    const datetime7 = DateTime.fromJSDate(today).plus({ hours: 1, minutes: 2, seconds: 30 });
    const result7 = DateTimeHelper.diffDateTime(DateTime.fromJSDate(today), datetime7, "seconds");
    expect(result7.toObject()).toEqual({ seconds: 3750 });
  });

  test('matchCronExpreesionAndDate works', () => {
    // every 10 minutes
    const cronExpression = "*/10 * * * *";
    // today at 12:10:00
    const date = DateTime.fromObject({ hour: 12, minute: 10 }).toJSDate();
    const result = DateTimeHelper.matchCronExpreesionAndDate(cronExpression, date);
    expect(result).toBe(true);

    // today at 12:11:00
    const date2 = DateTime.fromObject({ hour: 12, minute: 11 }).toJSDate();
    const result2 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression, date2);
    expect(result2).toBe(false);

    // every 1 hour
    const cronExpression2 = "0 * * * *";
    // today at 12:10:00
    const date3 = DateTime.fromObject({ hour: 12, minute: 10 }).toJSDate();
    const result3 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression2, date3);
    expect(result3).toBe(false);

    // today at 13:10:00
    const date4 = DateTime.fromObject({ hour: 13, minute: 10 }).toJSDate();
    const result4 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression2, date4);
    expect(result4).toBe(false);

    // today at 10:00:00
    const date5 = DateTime.fromObject({ hour: 10, minute: 0 }).toJSDate();
    const result5 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression2, date5);
    expect(result5).toBe(true);

    // 9 am everyday
    const cronExpression3 = "0 9 * * *";
    // today at 9:00:00
    const date6 = DateTime.fromObject({ hour: 9, minute: 0 }).toJSDate();
    const result6 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression3, date6);
    expect(result6).toBe(true);
    
    // Wednesday 10 am
    const date7 = DateTime.fromObject({ hour: 10, minute: 0 }).toJSDate();
    const result7 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression3, date7);
    expect(result7).toBe(false);

    // Thursday 9 am
    const date8 = DateTime.fromObject({ hour: 9, minute: 0, weekday: 4 }).toJSDate();
    const result8 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression3, date8);
    expect(result8).toBe(true);

    // Friday 10 am
    const date9 = DateTime.fromObject({ hour: 10, minute: 0, weekday: 5 }).toJSDate();
    const result9 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression3, date9);
    expect(result9).toBe(false);

    // Saturday 11 am
    const date10 = DateTime.fromObject({ hour: 11, minute: 0, weekday: 6 }).toJSDate();
    const result10 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression3, date10);
    expect(result10).toBe(false);

    // Sunday 9 am
    const date11 = DateTime.fromObject({ hour: 9, minute: 0, weekday: 0 }).toJSDate();
    const result11 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression3, date11);
    expect(result11).toBe(true);


    // 10 am on weekday
    const cronExpression4 = "0 10 * * 1-5";
    // Wednesday 10 am
    const date12 = DateTime.fromObject({ hour: 10, minute: 0, weekday: 3 }).toJSDate();
    const result12 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression4, date12);
    expect(result12).toBe(true);

    // Saturday 10 am
    const date13 = DateTime.fromObject({ hour: 10, minute: 0, weekday: 6 }).toJSDate();
    const result13 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression4, date13);
    expect(result13).toBe(false);

    // Sunday 10 am
    const date14 = DateTime.fromObject({ hour: 10, minute: 0, weekday: 7 }).toJSDate();
    const result14 = DateTimeHelper.matchCronExpreesionAndDate(cronExpression4, date14);
    expect(result14).toBe(false);
    
  });

  test('isDateStringWithinInterval works', () => {
    // date string 2024-04-12
    //  at detroit timezone 
    const dateString = "2024-04-12";
    // timezone detroit
    const timezone = "America/Detroit";

    // between 2024-04-10 and 2024-04-15 in Detroit timezone
    const result = DateTimeHelper.isDateStringWithinInterval(dateString, timezone, DateTime.fromObject({ year: 2024, month: 4, day: 10 }, { zone: timezone }), DateTime.fromObject({ year: 2024, month: 4, day: 15 }, { zone: timezone }));
    expect(result).toBe(true);

    // between 2024-04-15 and 2024-04-20
    const result2 = DateTimeHelper.isDateStringWithinInterval(dateString, timezone, DateTime.fromObject({ year: 2024, month: 4, day: 15 }, { zone: timezone }), DateTime.fromObject({ year: 2024, month: 4, day: 20 }, { zone: timezone }));
    expect(result2).toBe(false);

    // between 2024-04-09 and 2024-04-16
    const result3 = DateTimeHelper.isDateStringWithinInterval(dateString, timezone, DateTime.fromObject({ year: 2024, month: 4, day: 9 }, { zone: timezone }), DateTime.fromObject({ year: 2024, month: 4, day: 16 }, { zone: timezone }));
    expect(result3).toBe(true);

    // between 2024-04-12 and 2024-04-17 in Taipei timezone
    const timezone2 = "Asia/Taipei";
    const result4 = DateTimeHelper.isDateStringWithinInterval(dateString, timezone, DateTime.fromObject({ year: 2024, month: 4, day: 12 }, { zone: timezone2 }), DateTime.fromObject({ year: 2024, month: 4, day: 17 }, { zone: timezone2 }));
    expect(result4).toBe(true);

    // between 2024-04-13 and 2024-04-16 in Taipei timezone
    const result5 = DateTimeHelper.isDateStringWithinInterval(dateString, timezone, DateTime.fromObject({ year: 2024, month: 4, day: 13 }, { zone: timezone2 }), DateTime.fromObject({ year: 2024, month: 4, day: 16 }, { zone: timezone2 }));
    expect(result5).toBe(false);


    });

  test("isDatTimeWithinInterval works", () => {
    const startDateTime = DateTime.fromObject({ year: 2024, month: 4, day: 10 }, { zone: "America/Detroit" });
    const endDateTime = DateTime.fromObject({ year: 2024, month: 4, day: 15 }, { zone: "America/Detroit" });
    const targetDateTime = DateTime.fromObject({ year: 2024, month: 4, day: 12 }, { zone: "America/Detroit" });
    const result = DateTimeHelper.isDatTimeWithinInterval(targetDateTime, startDateTime, endDateTime);
    expect(result).toBe(true);

    // 2024-04-12 in Taipei timezone
    // between 2024-04-10 and 2024-04-12 in Detroit timezone
    const startDateTime2 = DateTime.fromObject({ year: 2024, month: 4, day: 10 }, { zone: "America/Detroit" }); 
    const endDateTime2 = DateTime.fromObject({ year: 2024, month: 4, day: 12 }, { zone: "America/Detroit" });
    const targetDateTime2 = DateTime.fromObject({ year: 2024, month: 4, day: 12 }, { zone: "Asia/Taipei" });
    const result3 = DateTimeHelper.isDatTimeWithinInterval(targetDateTime2, startDateTime2, endDateTime2);
    expect(result3).toBe(true);
    
    // 2024-04-12 in Detroit timezone
    // between 2024-04-10 and 2024-04-12 in Taipei timezone
    const startDateTime3 = DateTime.fromObject({ year: 2024, month: 4, day: 10 }, { zone: "Asia/Taipei" });
    const endDateTime3 = DateTime.fromObject({ year: 2024, month: 4, day: 12 }, { zone: "Asia/Taipei" });
    const targetDateTime3 = DateTime.fromObject({ year: 2024, month: 4, day: 12 }, { zone: "America/Detroit" });
    const result4 = DateTimeHelper.isDatTimeWithinInterval(targetDateTime3, startDateTime3, endDateTime3);
    expect(result4).toBe(false);
    
  });
});

