// Firebase SDK Imports (Using v11.0.2 for stability)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
export default class Leaderboard {
    constructor() {
        // Your web app's Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyDz6mq-JYndFIUANZzDJ_1B6srGSormS60",
            authDomain: "pacman-project-6c275.firebaseapp.com",
            projectId: "pacman-project-6c275",
            storageBucket: "pacman-project-6c275.firebasestorage.app",
            messagingSenderId: "321599221178",
            appId: "1:321599221178:web:dec70f6b0eb2f6bf1c0183",
            measurementId: "G-ZK3SXP030E"
        };
        // Initialize Firebase
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        this.collectionName = "leaderboard";
    }
    async getScores() {
        try {
            const q = query(
                collection(this.db, this.collectionName),
                orderBy("score", "desc"),
                limit(10)
            );
            const querySnapshot = await getDocs(q);
            const scores = [];
            querySnapshot.forEach((doc) => {
                scores.push(doc.data());
            });
            return scores;
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            // Fallback for offline or permission errors
            return [{ name: "OFFLINE", score: 0 }];
        }
    }
    async submitScore(name, score) {
        try {
            await addDoc(collection(this.db, this.collectionName), {
                name: name,
                score: score,
                date: new Date().toISOString()
            });
            console.log("Score submitted!");
            // Return updated list
            return await this.getScores();
        } catch (error) {
            console.error("Error submitting score:", error);
            return [];
        }
    }
}