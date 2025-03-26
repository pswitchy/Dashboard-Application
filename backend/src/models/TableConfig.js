const mongoose = require('mongoose');

const ColumnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Text', 'Date'], required: true },
}, { _id: false }); // Don't generate _id for subdocuments

const TableConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Assuming one table config per user for simplicity
  },
  googleSheetId: {
    type: String,
    required: true,
  },
  sheetName: { // Added sheet name for clarity
    type: String,
    required: true,
    default: 'Sheet1',
  },
  headerRow: { // Added header row number
      type: Number,
      required: true,
      default: 1,
  },
  columns: [ColumnSchema], // Columns defined during creation (matching Google Sheet)
  dynamicColumns: [ColumnSchema], // Columns added dynamically in the dashboard
}, { timestamps: true });

module.exports = mongoose.model('TableConfig', TableConfigSchema);