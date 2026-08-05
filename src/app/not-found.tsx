import React from 'react';
import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.description}>
          The page you are looking for does not exist or you do not have access to it.
        </p>
        <Link href="/dashboard" className={styles.link}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
