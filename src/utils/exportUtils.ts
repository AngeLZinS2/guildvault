
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

type TransactionForExport = {
  tipo: string;
  membro: string;
  descricao: string;
  valor: string;
  data: string;
  verificado: string;
};

export const exportToExcel = (data: TransactionForExport[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
};

export const exportToPDF = async (data: TransactionForExport[], fileName: string) => {
  // Dynamically import jspdf and jspdf-autotable to reduce initial load size
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;
  
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text("Relatório de Transações Financeiras", 14, 22);
  doc.setFontSize(11);
  doc.text(`Exportado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
  
  // Generate table
  autoTable(doc, {
    head: [['Tipo', 'Membro', 'Descrição', 'Valor', 'Data', 'Status']],
    body: data.map(item => [
      item.tipo,
      item.membro,
      item.descricao,
      item.valor,
      item.data,
      item.verificado
    ]),
    startY: 40,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [66, 66, 66] }
  });
  
  // Save PDF
  doc.save(`${fileName}.pdf`);
};
