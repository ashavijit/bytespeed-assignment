import express, { Request, Response } from "express";
import mongoose, { ConnectOptions } from "mongoose";

const app = express();
app.use(express.json());

// Connect to MongoDB

async function connect() {
  try {
    await mongoose.connect(
      "mongodb+srv://avijit:ab4WyJv9XCMaSkhU@avijitjsx.wyjhb6c.mongodb.net/?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      } as ConnectOptions
    );
    console.log("Connected to Distribution API Database - Initial Connection");
  } catch (err) {
    console.error(
      "Initial Distribution API Database connection error occurred -",
      err
    );
  }
}

const contactSchema = new mongoose.Schema({
  phoneNumber: String,
  email: String,
  linkedId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
  linkPrecedence: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
});

const Contact = mongoose.model("Contact", contactSchema);

app.get("/contacts", async (_req: Request, res: Response) => {
  const contacts = await Contact.find();
  res.send(contacts);
});

app.post("/contacts", async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      res.status(400).send("Email or Phone Number is required");
      return;
    }

    const contact = new Contact(req.body);
    const savedContact = await contact.save();
    res.send(savedContact);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/identify", async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    // Query the database to find matching contacts
    const matchingContacts = await Contact.find({
      $or: [{ email }, { phoneNumber }],
    });

    let primaryContact: any;
    const secondaryContacts: any[] = [];

    for (const contact of matchingContacts) {
      if (!primaryContact && contact.linkPrecedence === "primary") {
        primaryContact = contact;
      } else {
        secondaryContacts.push(contact);
      }
    }

    if (!primaryContact) {
      // Create a new primary contact if none exists
      primaryContact = new Contact(req.body);
      primaryContact.linkPrecedence = "primary";
      await primaryContact.save();
    }

    for (const secondaryContact of secondaryContacts) {
      secondaryContact.linkedId = primaryContact._id;
      secondaryContact.linkPrecedence = "secondary";
      await secondaryContact.save();
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});

connect();
