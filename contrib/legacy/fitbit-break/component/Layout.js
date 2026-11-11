import React from "react";
import { Layout as BaseLayout } from "@time-fit/web-components";
import styles from "../styles/Home.module.css";

export default function Layout(props) {
  return (
    <BaseLayout
      title={props.title}
      description={props.description}
      containerClassName={styles.container}
      mainClassName={styles.main}
      footerClassName={styles.footer}
      appName="Fitbit Break"
    >
      {props.children}
    </BaseLayout>
  );
}
