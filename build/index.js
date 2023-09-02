"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Connect to MongoDB
function connect() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect("mongodb+srv://avijit:ab4WyJv9XCMaSkhU@avijitjsx.wyjhb6c.mongodb.net/?retryWrites=true&w=majority", {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log("Connected to Distribution API Database - Initial Connection");
        }
        catch (err) {
            console.error("Initial Distribution API Database connection error occurred -", err);
        }
    });
}
const contactSchema = new mongoose_1.default.Schema({
    phoneNumber: String,
    email: String,
    linkedId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Contact" },
    linkPrecedence: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: Date,
});
const Contact = mongoose_1.default.model("Contact", contactSchema);
app.get("/contacts", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const contacts = yield Contact.find();
    res.send(contacts);
}));
app.post("/contacts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phoneNumber } = req.body;
        if (!email && !phoneNumber) {
            res.status(400).send("Email or Phone Number is required");
            return;
        }
        const contact = new Contact(req.body);
        const savedContact = yield contact.save();
        res.send(savedContact);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.post("/identify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phoneNumber } = req.body;
        // Query the database to find matching contacts
        const matchingContacts = yield Contact.find({
            $or: [{ email }, { phoneNumber }],
        });
        let primaryContact;
        const secondaryContacts = [];
        for (const contact of matchingContacts) {
            if (!primaryContact && contact.linkPrecedence === "primary") {
                primaryContact = contact;
            }
            else {
                secondaryContacts.push(contact);
            }
        }
        if (!primaryContact) {
            // Create a new primary contact if none exists
            primaryContact = new Contact(req.body);
            primaryContact.linkPrecedence = "primary";
            yield primaryContact.save();
        }
        for (const secondaryContact of secondaryContacts) {
            secondaryContact.linkedId = primaryContact._id;
            secondaryContact.linkPrecedence = "secondary";
            yield secondaryContact.save();
        }
        const emails = matchingContacts.map((contact) => contact.email);
        const phoneNumbers = matchingContacts.map((contact) => contact.phoneNumber);
        // Extract secondary contact IDs
        const secondaryContactIds = secondaryContacts.map((contact) => contact._id);
        const countSecondaryContacts = secondaryContacts.length;
        // Respond with the consolidated contact information
        res.status(200).json({
            contact: {
                primaryContactId: primaryContact._id,
                emails,
                phoneNumbers,
                secondaryContactIds,
                countSecondaryContacts,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.listen(3000, () => {
    console.log("Listening on port 3000");
});
connect();
