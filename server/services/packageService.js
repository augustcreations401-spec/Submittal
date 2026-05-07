const PDFDocument = require('pdfkit');

function generateTransmittal(item, project, revision, selectedFiles, complianceStatement) {
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Heading
  doc.fontSize(24).fillColor('#1B1B1B')
     .font('Helvetica-Bold')
     .text('Submittal Transmittal', { align: 'left' });
  doc.moveDown(0.5);

  // Project info
  doc.fontSize(11).font('Helvetica').fillColor('#333');
  doc.text(`Project: ${project.name || '—'}`);
  doc.text(`General Contractor: ${project.gc_name || '—'}`);
  doc.text(`Project Number: ${project.project_number || '—'}`);
  doc.text(`Date: ${today}`);
  doc.moveDown(0.8);

  // Spec info
  doc.font('Helvetica-Bold').text('Submittal Item');
  doc.font('Helvetica').text(`${item.spec_section || '—'}  ${item.spec_section_title || ''}`);
  doc.text(`Scope: ${item.scope_item || '—'}`);
  doc.text(`Revision: ${revision.revision_number}`);
  doc.moveDown(0.8);

  // Compliance statement
  if (complianceStatement) {
    doc.font('Helvetica-Bold').text('Compliance Statement');
    doc.font('Helvetica').text(complianceStatement, { lineGap: 4 });
    doc.moveDown(0.8);
  }

  // Enclosed documents
  doc.font('Helvetica-Bold').text('Enclosed Documents');
  doc.font('Helvetica');
  if (selectedFiles.length === 0) {
    doc.text('(none selected)');
  } else {
    selectedFiles.forEach((f, i) => doc.text(`${i + 1}. ${f}`));
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(9).fillColor('#999')
     .text('Prepared by SpecMatch · All submittals reviewed by preparer', { align: 'center' });

  return doc;
}

module.exports = { generateTransmittal };
