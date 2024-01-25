import { Component } from "react";
import { createRoot } from "react-dom/client";

import "./style.scss";

const HOST = process.env.REACT_APP_SERVER_HOST;
const TOKEN = process.env.REACT_APP_SERVER_TOKEN;

class Website extends Component {

    constructor(props) {

        super(props);

        this.state = { connected: false, code: null, bots: null, a2f: [], question: null };
    }

    componentDidMount() {

        this.connect();
    }

    connect() {

        this.ws = new WebSocket(HOST);

        this.ws.addEventListener("open", () => {

            this.ws.send(JSON.stringify({ command: "LOGIN", token: TOKEN }));
        });

        this.ws.addEventListener("message", (event) => {

            const message = JSON.parse(event.data);

            if (message.event === "LOGGED")
                this.setState({ connected: true });
            else if (message.event === "STATE")
                this.setState({ code: message.code, bots: message.bots, question: message.question });
            else if (message.event === "A2F_RESET")
                this.setState({ a2f: [] });
        });

        this.ws.addEventListener("close", () => {

            this.setState({ connected: false, code: null, bots: null, question: null });
            setTimeout(() => this.connect(), 1000);
        });
    }

    render() {

        const setCode = () => {

            const code = prompt("Code ?");

            if (!code) return;

            this.ws.send(JSON.stringify({ command: "SET_CODE", code }));
        }

        const addBot = () => {

            const name = prompt("Nom du robot ?");

            if (!name) return;

            this.ws.send(JSON.stringify({ command: "ADD_BOT", name }));
        }

        const a2f = (color) => {
            this.setState({ a2f: [...this.state.a2f, color] }, () => {
                if (this.state.a2f.length === 4)
                    this.ws.send(JSON.stringify({ command: "A2F", a2f: this.state.a2f }));
            });
        }

        return <>

            <div className="title">Kahoot Bots</div>

            {!this.state.connected ? <div className="loading"><i className="fas fa-spinner" /></div> : null}

            <div className="boxes">

                {this.state.connected ? <div className="box">
                    <div className="box-title">Code</div>
                    <div>{this.state.code || "Non défini"}</div>
                    <button onClick={setCode}>Définir le code</button>
                </div> : null}

                {this.state.bots ? <div className="box">
                    <div className="box-title">Robots</div>
                    {this.state.bots.length === 0 ? <div>Aucun robot</div> : <div className="bots">
                        {this.state.bots.map((bot, i) => <div key={i} className="bot">
                            <span>{bot.wantedName} - {(() => {
                                if (bot.exited) return "Un problème est survenu";
                                if (!bot.ready) return "Lancement...";
                                if (!this.state.code) return "En attente du code...";
                                if (bot.a2f) return "En attente de l'A2F...";
                                if (!bot.joined) return "Connexion...";
                                if (bot.name !== bot.wantedName) return "Connecté en tant que " + bot.name;
                                return "Connecté";
                            })()}</span> <button onClick={() => this.ws.send(JSON.stringify({ command: "REMOVE_BOT", id: i }))}>Supprimer</button>
                        </div>)}
                    </div>}
                    <button onClick={addBot}>Ajouter un robot</button>
                </div> : null}

                {this.state.code && this.state.bots.some((bot) => bot.a2f) ? <div className="box">
                    <div className="box-title">A2F</div>
                    {this.state.bots.some((bot) => bot.a2fFail) ? <div>Invalide, en attente du prochain</div> : <div className="a2f">
                        <span>
                            <button className="red" disabled={this.state.a2f.includes("triangle")} onClick={() => a2f("triangle")}>Rouge</button>
                            <button className="blue" disabled={this.state.a2f.includes("diamond")} onClick={() => a2f("diamond")}>Bleu</button>
                        </span>
                        <span>
                            <button className="yellow" disabled={this.state.a2f.includes("circle")} onClick={() => a2f("circle")}>Jaune</button>
                            <button className="green" disabled={this.state.a2f.includes("square")} onClick={() => a2f("square")}>Vert</button>
                        </span>
                    </div>}
                </div> : null}

                {this.state.question ? <div className="box">
                    <div className="box-title">Question</div>
                    {this.state.question.question ? <div>{this.state.question.question}</div> : null}
                    {this.state.question.askingChatGpt ? <div>Demande à ChatGPT...</div> : null}
                    {this.state.question.correct !== null ? <div>{this.state.question.correct ? "Correct" : "Incorrect"}</div> : null}
                    <div className="answers">
                        <div>
                            {Array.from({ length: 2 }, (_, i) =>
                                <button key={i} className={this.state.question.type === "classic" ? ["red", "blue"][i] : ["blue", "red"][i]}
                                    disabled={this.state.question.answer !== null || this.state.question.correct !== null}
                                    onClick={() => this.ws.send(JSON.stringify({ command: "ANSWER", answer: i }))}>
                                    <span>{this.state.question.type === "classic" ? (this.state.question.answers ? this.state.question.answers[i] : ["Rouge", "Bleu"][i]) : ["Vrai", "Faux"][i]}</span>
                                    {this.state.question.answer === i ? <i className="fas fa-check" /> : null}
                                </button>
                            )}
                        </div>
                        {this.state.question.answersCount > 2 ? <div>
                            {Array.from({ length: this.state.question.answersCount - 2 }, (_, i) =>
                                <button key={i} className={["yellow", "green"][i]}
                                    disabled={this.state.question.answer !== null || this.state.question.correct !== null}
                                    onClick={() => this.ws.send(JSON.stringify({ command: "ANSWER", answer: i + 2 }))}>
                                    <span>{this.state.question.answers ? this.state.question.answers[i + 2] : ["Jaune", "Vert"][i]}</span>
                                    {this.state.question.answer === i + 2 ? <i className="fas fa-check" /> : null}
                                </button>
                            )}
                        </div> : null}
                    </div>
                </div> : null}

            </div>

        </>;
    }
}

createRoot(document.getElementById("root")).render(<Website />);
