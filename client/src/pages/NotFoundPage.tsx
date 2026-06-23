import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircleOff } from 'lucide-react';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <main className={styles.container}>
      <motion.section
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <MessageCircleOff className={styles.icon} />
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.text}>That Relay screen does not exist.</p>
        <Link className={styles.link} to="/chat">
          Back to chat
        </Link>
      </motion.section>
    </main>
  );
}
