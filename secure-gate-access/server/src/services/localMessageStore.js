import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store messages in a local JSON file
const DATA_DIR = path.join(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'local_messages.json');

class LocalMessageStore {
    constructor() {
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    }

    /**
     * Save a message to the local store
     * @param {string} type - 'email' or 'sms'
     * @param {string} to - Recipient
     * @param {string} content - Message content
     * @param {object} metadata - Additional metadata
     */
    async save(type, to, content, metadata = {}) {
        try {
            this.ensureDataDir();

            let messages = [];
            if (fs.existsSync(STORE_FILE)) {
                const data = fs.readFileSync(STORE_FILE, 'utf8');
                try {
                    messages = JSON.parse(data);
                } catch (e) {
                    messages = [];
                }
            }

            const newMessage = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                type,
                to,
                content,
                metadata,
                read: false
            };

            // Add to beginning of array
            messages.unshift(newMessage);

            // Keep only last 100 messages to save space
            if (messages.length > 100) {
                messages = messages.slice(0, 100);
            }

            fs.writeFileSync(STORE_FILE, JSON.stringify(messages, null, 2));
            return newMessage;
        } catch (error) {
            console.error('Failed to save local message:', error);
            return null;
        }
    }

    /**
     * Get all stored messages
     */
    getAll() {
        try {
            if (!fs.existsSync(STORE_FILE)) {
                return [];
            }
            const data = fs.readFileSync(STORE_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    /**
     * Clear all messages
     */
    clear() {
        try {
            if (fs.existsSync(STORE_FILE)) {
                fs.unlinkSync(STORE_FILE);
            }
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default new LocalMessageStore();
