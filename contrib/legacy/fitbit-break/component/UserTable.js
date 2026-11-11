import React,  { Fragment } from 'react';
import Link from "next/link";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Button } from '@mui/material';
import ObjectListExortToolbar from './ObjectListExortToolbar.js';


export default function UserTable({ infoList, userInfo, hostURL, renderData }) {

  return (
    <Fragment>
      <br />
      <ObjectListExortToolbar filePrefix={"User"} infoList={infoList} userInfo={userInfo}></ObjectListExortToolbar>
      <br />
      {renderData? <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell align="right">Action</TableCell>
              <TableCell align="right">User Name</TableCell>
              <TableCell align="right">Phone</TableCell>
              <TableCell align="right">Timezone</TableCell>
              <TableCell align="right">Phase</TableCell>
              <TableCell align="right">Join At</TableCell>
              <TableCell align="right">Activate At</TableCell>
              <TableCell align="right">Complete At</TableCell>
              <TableCell align="right">Group Membership</TableCell>
              <TableCell align="right">Fitbit Id</TableCell>
              <TableCell align="right">Step Goal</TableCell>
              <TableCell align="right">Step Goal Time</TableCell>
              <TableCell align="right">Weekday Wakeup</TableCell>
              <TableCell align="right">Weekday Bed</TableCell>
              <TableCell align="right">Weekend Wakeup</TableCell>
              <TableCell align="right">Weekend Bed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {infoList.map((row, index) => (
              <TableRow
                key={index}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell align="right">
                  <Link href={`/user-edit?user=${row.username}`}>
                    <Button variant="contained">
                      Edit
                    </Button>
                  </Link>
                </TableCell>
                <TableCell align="right">{row.username}</TableCell>
                <TableCell align="right">{row.phone}</TableCell>
                <TableCell align="right">{row.timezone}</TableCell>
                <TableCell align="right">{row.phase}</TableCell>
                <TableCell align="right">{row.joinAt}</TableCell>
                <TableCell align="right">{row.activateAt}</TableCell>
                <TableCell align="right">{row.completeAt}</TableCell>
                <TableCell align="right">{JSON.stringify(row.groupMembership)}</TableCell>
                <TableCell align="right">{row.fitbitId}</TableCell>
                <TableCell align="right">{row.dailyStepsGoal}</TableCell>
                <TableCell align="right">{JSON.stringify(row.dailyStepsGoalMeta)}</TableCell>
                <TableCell align="right">{row.weekdayWakeup}</TableCell>
                <TableCell align="right">{row.weekdayBed}</TableCell>
                <TableCell align="right">{row.weekendWakeup}</TableCell>
                <TableCell align="right">{row.weekendBed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>:null}
      

    </Fragment>
  )
}
