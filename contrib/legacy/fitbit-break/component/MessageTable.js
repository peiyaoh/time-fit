import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Button } from '@mui/material';
import { toast } from 'react-toastify';
import AppHelper from "../lib/AppHelper";

export default function MessageTable({ infoList, userInfo, assetHostURL, renderData }) {
  
  return (
    <>
    {renderData? <TableContainer component={Paper}>
    <Table sx={{ minWidth: 650 }} aria-label="simple table">
      <TableHead>
        <TableRow>
          <TableCell align="right">Send</TableCell>
          <TableCell align="right">Message Label</TableCell>
          <TableCell align="right">Group</TableCell>
          <TableCell align="right">Group Index</TableCell>
          <TableCell align="right">Intervention Message</TableCell>
          <TableCell align="right">Walk Message</TableCell>
          <TableCell align="right">Gif</TableCell>
          <TableCell align="right">Created At</TableCell>
          <TableCell align="right">Updated At</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {infoList.map((row, index) => (
          <TableRow
            key={index}
            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
          >
            <TableCell align="right"><Button variant="contained" onClick={(event) => {
              const messageInfo = row;
              const composePromise = fetch("/api/message-composer?function_name=compose_message", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userInfo: userInfo,
                  messageInfo: messageInfo,
                  surveyURL: ""
                }),
              })

              return composePromise
              .then((res) => res.json())
              .then((response) => {
                return response.result;
              })
              .then((messageBody) => {

                  let gifURL = "";

                  if (messageInfo.gif != undefined) {
                    gifURL = `${assetHostURL}/image/gif/${messageInfo.gif}.gif`;
                  }

                  const msgPromise = AppHelper.sendTwilioMessage(userInfo.phone, messageBody, gifURL.length > 0 ? [gifURL] : []);

                  toast(`Sending: ${messageBody}`);

                  return msgPromise;
              });

            }} >Send</Button></TableCell>
            <TableCell align="right">{row.label}</TableCell>
            <TableCell align="right">{row.group}</TableCell>
            <TableCell align="right">{row.groupIndex}</TableCell>
            <TableCell align="right">{row.interventionMessage}</TableCell>
            <TableCell align="right">{row.walkMessage}</TableCell>
            <TableCell align="right">{row.gif}</TableCell>
            <TableCell align="right">{row.createdAt}</TableCell>
            <TableCell align="right">{row.updatedAt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>:null}
    </>
    
    
  )
}
