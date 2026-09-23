import React from "react";
import Head from "next/head";

export default function Layout(props) {
  return (
    <div className={props.containerClassName || "container"}>
      <Head>
        <title>{props.title}</title>
        <meta name="description" content={props.description} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={props.mainClassName || "main"}>
        {props.children}
      </main>

      <footer className={props.footerClassName || "footer"}>
        <br />
        <div>
          <b>{props.appName || "Time Fit"}</b>
        </div>
        <br />
      </footer>
    </div>
  );
}
