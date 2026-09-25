import { CronExpressionParser } from "cron-parser";
import { DateTime, Interval } from "luxon";
export default class TimeZoneHelper {
  static usTimeZoneOffetInfoList = [
    { name: "America/New_York", offset: -240, offsetLabel: "GMT -4" },

    /*
        { name: 'America/Detroit', offset: -240, offsetLabel: 'GMT -4' },
        {
            name: 'America/Kentucky/Louisville',
            offset: -240,
            offsetLabel: 'GMT -4'
        },
        {
            name: 'America/Kentucky/Monticello',
            offset: -240,
            offsetLabel: 'GMT -4'
        },
        {
            name: 'America/Indiana/Indianapolis',
            offset: -240,
            offsetLabel: 'GMT -4'
        },
        {
            name: 'America/Indiana/Vincennes',
            offset: -240,
            offsetLabel: 'GMT -4'
        },
        {
            name: 'America/Indiana/Winamac',
            offset: -240,
            offsetLabel: 'GMT -4'
        },
        {
            name: 'America/Indiana/Marengo',
            offset: -240,
            offsetLabel: 'GMT -4'
        },
        {
            name: 'America/Indiana/Petersburg',
            offset: -240,
            offsetLabel: 'GMT -4'
        },
        {
            name: 'America/Indiana/Vevay',
            offset: -240,
            offsetLabel: 'GMT -4'
        },
        */
    { name: "America/Chicago", offset: -300, offsetLabel: "GMT -5" },
    /*
        {
            name: 'America/Indiana/Tell_City',
            offset: -300,
            offsetLabel: 'GMT -5'
        },
        { name: 'America/Indiana/Knox', offset: -300, offsetLabel: 'GMT -5' },
        { name: 'America/Menominee', offset: -300, offsetLabel: 'GMT -5' },
        {
            name: 'America/North_Dakota/Center',
            offset: -300,
            offsetLabel: 'GMT -5'
        },
        {
            name: 'America/North_Dakota/New_Salem',
            offset: -300,
            offsetLabel: 'GMT -5'
        },
        {
            name: 'America/North_Dakota/Beulah',
            offset: -300,
            offsetLabel: 'GMT -5'
        },
        */
    { name: "America/Denver", offset: -360, offsetLabel: "GMT -6" },
    /*{ name: 'America/Boise', offset: -360, offsetLabel: 'GMT -6' },*/
    /* { name: 'America/Phoenix', offset: -420, offsetLabel: 'GMT -7' }, */
    { name: "America/Los_Angeles", offset: -420, offsetLabel: "GMT -7" },
    { name: "America/Anchorage", offset: -480, offsetLabel: "GMT -8" },
    /*
        { name: 'America/Juneau', offset: -480, offsetLabel: 'GMT -8' },
        { name: 'America/Sitka', offset: -480, offsetLabel: 'GMT -8' },
        { name: 'America/Metlakatla', offset: -480, offsetLabel: 'GMT -8' },
        { name: 'America/Yakutat', offset: -480, offsetLabel: 'GMT -8' },
        { name: 'America/Nome', offset: -480, offsetLabel: 'GMT -8' },
        */
    { name: "America/Adak", offset: -540, offsetLabel: "GMT -9" },
    { name: "Pacific/Honolulu", offset: -600, offsetLabel: "GMT -10" },
    { name: "Brazil/Rio de Janeiro", offset: -180, offsetLabel: "GMT -3" },
    { name: "Canada/St. Johns", offset: -150, offsetLabel: "GMT -2.5" },
    { name: "United Kingdom/London", offset: -0, offsetLabel: "GMT -0" },
    { name: "France/Paris", offset: +60, offsetLabel: "GMT +1" },
    { name: "South Africa/Cape Town", offset: +120, offsetLabel: "GMT +2" },
    { name: "Kenya/Nairobi", offset: +180, offsetLabel: "GMT +3" },
    { name: "Iran/Tehran", offset: +210, offsetLabel: "GMT +3.5" },
    { name: "United Arab Emirates/Dubai", offset: +240, offsetLabel: "GMT +4" },
    { name: "Afghanistan/Kabul", offset: +270, offsetLabel: "GMT +4.5" },
    { name: "Pakistan/Islamabad", offset: +300, offsetLabel: "GMT +5" },
    { name: "India/Mumbai", offset: +330, offsetLabel: "GMT +5.5" },
    { name: "Thailand/Bangkok", offset: +420, offsetLabel: "GMT +7" },
    { name: "China/Beijing", offset: +480, offsetLabel: "GMT +8" },
    { name: "South Korea/Seoul", offset: +540, offsetLabel: "GMT +9" },
    { name: "Australia/Brisbane", offset: +600, offsetLabel: "GMT +10" },
    {
      name: "South Australia/Adelaide",
      offset: +630,
      offsetLabel: "GMT +10.5",
    },
    { name: "Australia/Sydney", offset: +660, offsetLabel: "GMT +11" },
    { name: "New Zealand/Auckland", offset: +780, offsetLabel: "GMT +13" },
  ];
  constructor() {}
}
