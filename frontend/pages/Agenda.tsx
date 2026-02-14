import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const API_URL = 'http://localhost:8000/api';

interface DayData {
  date: string;
  day: number;
  billiard_revenue: number;
  ps4_revenue: number;
  bar_revenue: number;
  total_revenue: number;
  formatted_total: string;
  has_data: boolean;
}

interface MonthData {
  year: number;
  month: number;
  month_name: string;
  days: DayData[];
  totals: {
    billiard: number;
    ps4: number;
    bar: number;
    total: number;
    formatted_total: string;
  };
}

interface BilliardSession {
  id: number;
  table_identifier: string;
  client_name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  formatted_duration: string;
  price: number;
  formatted_price: string;
  is_paid: boolean;
}

interface PS4Session {
  id: number;
  game_name: string;
  players: number;
  duration_minutes: number;
  price: number;
  formatted_price: string;
  is_paid: boolean;
}

interface BarOrder {
  id: number;
  client_name: string;
  items: any[];
  total_price: number;
  formatted_price: string;
  is_paid: boolean;
}

interface DailyData {
  date: string;
  billiard: {
    sessions: BilliardSession[];
    total: number;
    formatted_total: string;
    count: number;
  };
  ps4: {
    sessions: PS4Session[];
    total: number;
    formatted_total: string;
    count: number;
  };
  bar: {
    orders: BarOrder[];
    total: number;
    formatted_total: string;
    count: number;
  };
  grand_total: number;
  formatted_grand_total: string;
}

export const Agenda: React.FC = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayData, setDayData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMonthData();
  }, [currentYear, currentMonth]);

  useEffect(() => {
    if (selectedDay) {
      fetchDayData(selectedDay);
    }
  }, [selectedDay]);

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/agenda/monthly/${currentYear}/${currentMonth}/`);
      if (res.ok) {
        const data = await res.json();
        setMonthData(data);
      }
    } catch (error) {
      console.error('Error fetching month data:', error);
    }
    setLoading(false);
  };

  const fetchDayData = async (date: string) => {
    try {
      const res = await fetch(`${API_URL}/agenda/daily/${date}/`);
      if (res.ok) {
        const data = await res.json();
        setDayData(data);
      }
    } catch (error) {
      console.error('Error fetching day data:', error);
    }
  };

  const previousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
    setDayData(null);
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
    setDayData(null);
  };

  const formatPrice = (mil: number) => {
    if (!mil || mil < 10000) return `${Math.round(mil || 0)} mil`;
    const dt = mil / 1000;
    return `${dt.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} DT`;
  };

  // Export functions
  const exportToPDF = () => {
    if (!dayData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = `Recette du ${new Date(selectedDay!).toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;
    doc.text(title, pageWidth / 2, 20, { align: 'center' });
    
    let yPos = 35;

    // Billiard Sessions
    if (dayData.billiard.sessions.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(34, 197, 94);
      doc.text(`Billard (${dayData.billiard.count} sessions) - ${dayData.billiard.formatted_total}`, 14, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Table', 'Client', 'Durée', 'Prix', 'Payé']],
        body: dayData.billiard.sessions.map(s => [
          s.table_identifier,
          s.client_name || '-',
          s.formatted_duration,
          s.formatted_price,
          s.is_paid ? 'Oui' : 'NON'
        ]),
        headStyles: { fillColor: [34, 197, 94] },
        didParseCell: (data: any) => {
          if (data.column.index === 4 && data.cell.raw === 'NON') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // PS4 Sessions
    if (dayData.ps4.sessions.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text(`PS4 (${dayData.ps4.count} sessions) - ${dayData.ps4.formatted_total}`, 14, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Jeu', 'Joueurs', 'Durée', 'Prix', 'Payé']],
        body: dayData.ps4.sessions.map(s => [
          s.game_name,
          `${s.players}P`,
          `${s.duration_minutes} min`,
          s.formatted_price,
          s.is_paid ? 'Oui' : 'NON'
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        didParseCell: (data: any) => {
          if (data.column.index === 4 && data.cell.raw === 'NON') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Bar Orders
    if (dayData.bar.orders.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(168, 85, 247);
      doc.text(`Bar (${dayData.bar.count} commandes) - ${dayData.bar.formatted_total}`, 14, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Client', 'Articles', 'Total', 'Payé']],
        body: dayData.bar.orders.map(o => [
          o.client_name || '-',
          o.items.map((item: any) => `${item.name} x${item.quantity}`).join(', '),
          o.formatted_price,
          o.is_paid ? 'Oui' : 'NON'
        ]),
        headStyles: { fillColor: [168, 85, 247] },
        didParseCell: (data: any) => {
          if (data.column.index === 3 && data.cell.raw === 'NON') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Grand Total
    doc.setFontSize(16);
    doc.setTextColor(234, 179, 8);
    doc.text(`Total du jour: ${dayData.formatted_grand_total}`, pageWidth / 2, yPos + 10, { align: 'center' });

    doc.save(`recette_${selectedDay}.pdf`);
  };

  const exportToWord = async () => {
    if (!dayData) return;

    const tableRows: TableRow[] = [];
    
    // Billiard header
    if (dayData.billiard.sessions.length > 0) {
      tableRows.push(new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: `Billard (${dayData.billiard.count} sessions) - ${dayData.billiard.formatted_total}`, bold: true, color: '22C55E' })],
            })],
            columnSpan: 5,
          })
        ]
      }));
      
      tableRows.push(new TableRow({
        children: ['Table', 'Client', 'Durée', 'Prix', 'Payé'].map(text => 
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text, bold: true })],
              alignment: AlignmentType.CENTER
            })]
          })
        )
      }));
      
      dayData.billiard.sessions.forEach(s => {
        tableRows.push(new TableRow({
          children: [
            s.table_identifier,
            s.client_name || '-',
            s.formatted_duration,
            s.formatted_price,
            s.is_paid ? 'Oui' : 'NON'
          ].map((text, idx) => new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ 
                text: String(text),
                color: idx === 4 && !s.is_paid ? 'DC2626' : '000000',
                bold: idx === 4 && !s.is_paid
              })]
            })]
          }))
        }));
      });
      
      tableRows.push(new TableRow({
        children: [new TableCell({ children: [new Paragraph('')] })]
      }));
    }

    // PS4
    if (dayData.ps4.sessions.length > 0) {
      tableRows.push(new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: `PS4 (${dayData.ps4.count} sessions) - ${dayData.ps4.formatted_total}`, bold: true, color: '3B82F6' })],
            })],
            columnSpan: 5,
          })
        ]
      }));
      
      tableRows.push(new TableRow({
        children: ['Jeu', 'Joueurs', 'Durée', 'Prix', 'Payé'].map(text => 
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text, bold: true })],
              alignment: AlignmentType.CENTER
            })]
          })
        )
      }));
      
      dayData.ps4.sessions.forEach(s => {
        tableRows.push(new TableRow({
          children: [
            s.game_name,
            `${s.players}P`,
            `${s.duration_minutes} min`,
            s.formatted_price,
            s.is_paid ? 'Oui' : 'NON'
          ].map((text, idx) => new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ 
                text: String(text),
                color: idx === 4 && !s.is_paid ? 'DC2626' : '000000',
                bold: idx === 4 && !s.is_paid
              })]
            })]
          }))
        }));
      });
      
      tableRows.push(new TableRow({
        children: [new TableCell({ children: [new Paragraph('')] })]
      }));
    }

    // Bar
    if (dayData.bar.orders.length > 0) {
      tableRows.push(new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: `Bar (${dayData.bar.count} commandes) - ${dayData.bar.formatted_total}`, bold: true, color: 'A855F7' })],
            })],
            columnSpan: 5,
          })
        ]
      }));
      
      tableRows.push(new TableRow({
        children: ['Client', 'Articles', '', 'Total', 'Payé'].map(text => 
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text, bold: true })],
              alignment: AlignmentType.CENTER
            })]
          })
        )
      }));
      
      dayData.bar.orders.forEach(o => {
        tableRows.push(new TableRow({
          children: [
            o.client_name || '-',
            o.items.map((item: any) => `${item.name} x${item.quantity}`).join(', '),
            '',
            o.formatted_price,
            o.is_paid ? 'Oui' : 'NON'
          ].map((text, idx) => new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ 
                text: String(text),
                color: idx === 4 && !o.is_paid ? 'DC2626' : '000000',
                bold: idx === 4 && !o.is_paid
              })]
            })]
          }))
        }));
      });
    }

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun({
              text: `Recette du ${new Date(selectedDay!).toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}`,
              bold: true,
              size: 32
            })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph(''),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),
          new Paragraph(''),
          new Paragraph({
            children: [new TextRun({
              text: `Total du jour: ${dayData.formatted_grand_total}`,
              bold: true,
              size: 28,
              color: 'EAB308'
            })],
            alignment: AlignmentType.CENTER
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `recette_${selectedDay}.docx`);
  };

  const exportToCSV = () => {
    if (!dayData) return;

    let csv = 'Recette du ' + new Date(selectedDay!).toLocaleDateString('fr-FR') + '\n\n';
    
    if (dayData.billiard.sessions.length > 0) {
      csv += `BILLARD (${dayData.billiard.count} sessions) - ${dayData.billiard.formatted_total}\n`;
      csv += 'Table,Client,Durée,Prix,Payé\n';
      dayData.billiard.sessions.forEach(s => {
        const paidStatus = s.is_paid ? 'Oui' : 'NON (NON PAYÉ)';
        csv += `${s.table_identifier},"${s.client_name || '-'}","${s.formatted_duration}","${s.formatted_price}","${paidStatus}"\n`;
      });
      csv += '\n';
    }

    if (dayData.ps4.sessions.length > 0) {
      csv += `PS4 (${dayData.ps4.count} sessions) - ${dayData.ps4.formatted_total}\n`;
      csv += 'Jeu,Joueurs,Durée,Prix,Payé\n';
      dayData.ps4.sessions.forEach(s => {
        const paidStatus = s.is_paid ? 'Oui' : 'NON (NON PAYÉ)';
        csv += `"${s.game_name}","${s.players}P","${s.duration_minutes} min","${s.formatted_price}","${paidStatus}"\n`;
      });
      csv += '\n';
    }

    if (dayData.bar.orders.length > 0) {
      csv += `BAR (${dayData.bar.count} commandes) - ${dayData.bar.formatted_total}\n`;
      csv += 'Client,Articles,Total,Payé\n';
      dayData.bar.orders.forEach(o => {
        const items = o.items.map((item: any) => `${item.name} x${item.quantity}`).join(', ');
        const paidStatus = o.is_paid ? 'Oui' : 'NON (NON PAYÉ)';
        csv += `"${o.client_name || '-'}","${items}","${o.formatted_price}","${paidStatus}"\n`;
      });
      csv += '\n';
    }

    csv += `TOTAL DU JOUR,${dayData.formatted_grand_total}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `recette_${selectedDay}.csv`);
  };

  const showDownloadMenu = () => {
    Swal.fire({
      title: 'Télécharger la recette',
      html: `
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
          <button id="btn-pdf" style="padding: 15px 20px; font-size: 16px; background: #ef4444; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
            PDF
          </button>
          <button id="btn-word" style="padding: 15px 20px; font-size: 16px; background: #3b82f6; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
            Word
          </button>
          <button id="btn-csv" style="padding: 15px 20px; font-size: 16px; background: #22c55e; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
            CSV
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Annuler',
      didOpen: () => {
        const pdfBtn = document.getElementById('btn-pdf');
        const wordBtn = document.getElementById('btn-word');
        const csvBtn = document.getElementById('btn-csv');
        
        pdfBtn?.addEventListener('click', () => {
          Swal.close();
          exportToPDF();
        });
        
        wordBtn?.addEventListener('click', () => {
          Swal.close();
          exportToWord();
        });
        
        csvBtn?.addEventListener('click', () => {
          Swal.close();
          exportToCSV();
        });
      }
    });
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  // Get the first day of the month and total days
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Create calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add the days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayData = monthData?.days.find(d => d.day === day);
    calendarDays.push({ day, data: dayData });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black italic text-white">
            📅 Agenda
          </h1>
          <button
            onClick={() => {
              setCurrentYear(today.getFullYear());
              setCurrentMonth(today.getMonth() + 1);
              setSelectedDay(null);
              setDayData(null);
            }}
            className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl font-bold text-sm hover:bg-zinc-700"
          >
            Aujourd'hui
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar */}
          <div className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-8">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={previousMonth}
                className="p-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-all"
              >
                ←
              </button>
              <h2 className="text-2xl font-black text-white">
                {monthNames[currentMonth - 1]} {currentYear}
              </h2>
              <button
                onClick={nextMonth}
                className="p-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-all"
              >
                →
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-bold text-zinc-500 uppercase py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="text-center py-20 text-zinc-500">Chargement...</div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((cell, index) => {
                  if (!cell) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }
                  
                  const { day, data } = cell;
                  const isSelected = selectedDay === `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = 
                    day === today.getDate() && 
                    currentMonth === today.getMonth() + 1 && 
                    currentYear === today.getFullYear();

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(`${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                      className={`
                        aspect-square rounded-xl flex flex-col items-center justify-center relative
                        transition-all font-bold text-sm
                        ${isSelected 
                          ? 'bg-yellow-500 text-black' 
                          : data?.has_data 
                            ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' 
                            : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700'
                        }
                        ${isToday ? 'ring-2 ring-yellow-500' : ''}
                      `}
                    >
                      <span>{day}</span>
                      {data?.has_data && !isSelected && (
                        <span className="text-[8px] mt-1 opacity-75">
                          {formatPrice(data.total_revenue)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Month Total */}
            {monthData && (
              <div className="mt-6 bg-black/30 rounded-2xl p-4">
                <h3 className="text-lg font-bold text-white mb-2">Total du mois</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-zinc-500">Billard</p>
                    <p className="font-bold text-emerald-500">{formatPrice(monthData.totals.billiard)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">PS4</p>
                    <p className="font-bold text-blue-500">{formatPrice(monthData.totals.ps4)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Bar</p>
                    <p className="font-bold text-purple-500">{formatPrice(monthData.totals.bar)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Total</p>
                    <p className="font-bold text-yellow-500">{monthData.totals.formatted_total}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Daily Details */}
          <div className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-8">
            {selectedDay ? (
              dayData ? (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-white">
                    📊 Recette du {new Date(selectedDay).toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h2>

                  {/* Grand Total */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center">
                    <p className="text-sm text-yellow-500 font-bold uppercase">Total du jour</p>
                    <p className="text-4xl font-black text-yellow-500 mt-2">
                      {dayData.formatted_grand_total}
                    </p>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={showDownloadMenu}
                    className="w-full py-4 bg-gradient-to-r from-red-500 via-blue-500 to-green-500 text-white font-bold text-lg rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3"
                  >
                    <span> Télécharger</span>
                    <span className="text-xl">PDF / Word / CSV</span>
                  </button>

                  {/* Billiard Sessions */}
                  <div className="bg-black/30 rounded-2xl p-4">
                    <h3 className="text-lg font-bold text-emerald-500 mb-4">
                      🎱 Billard ({dayData.billiard.count} sessions) - {dayData.billiard.formatted_total}
                    </h3>
                    {dayData.billiard.sessions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-zinc-500 text-xs uppercase">
                              <th className="text-left py-2">Table</th>
                              <th className="text-left py-2">Client</th>
                              <th className="text-left py-2">Durée</th>
                              <th className="text-right py-2">Prix</th>
                              <th className="text-center py-2">Payé</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayData.billiard.sessions.map(session => (
                              <tr key={session.id} className="border-t border-white/5">
                                <td className="py-2 font-bold">{session.table_identifier}</td>
                                <td className="py-2">{session.client_name}</td>
                                <td className="py-2 text-zinc-400">{session.formatted_duration}</td>
                                <td className="py-2 text-right font-bold text-emerald-500">{session.formatted_price}</td>
                                <td className="py-2 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    session.is_paid 
                                      ? 'bg-emerald-500/20 text-emerald-500' 
                                      : 'bg-rose-500/20 text-rose-500'
                                  }`}>
                                    {session.is_paid ? 'Oui' : 'Non'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-center py-4">Aucune session</p>
                    )}
                  </div>

                  {/* PS4 Sessions */}
                  <div className="bg-black/30 rounded-2xl p-4">
                    <h3 className="text-lg font-bold text-blue-500 mb-4">
                      🎮 PS4 ({dayData.ps4.count} sessions) - {dayData.ps4.formatted_total}
                    </h3>
                    {dayData.ps4.sessions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-zinc-500 text-xs uppercase">
                              <th className="text-left py-2">Jeu</th>
                              <th className="text-left py-2">Joueurs</th>
                              <th className="text-left py-2">Durée</th>
                              <th className="text-right py-2">Prix</th>
                              <th className="text-center py-2">Payé</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayData.ps4.sessions.map(session => (
                              <tr key={session.id} className="border-t border-white/5">
                                <td className="py-2 font-bold">{session.game_name}</td>
                                <td className="py-2">{session.players}P</td>
                                <td className="py-2 text-zinc-400">{session.duration_minutes} min</td>
                                <td className="py-2 text-right font-bold text-blue-500">{session.formatted_price}</td>
                                <td className="py-2 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    session.is_paid 
                                      ? 'bg-emerald-500/20 text-emerald-500' 
                                      : 'bg-rose-500/20 text-rose-500'
                                  }`}>
                                    {session.is_paid ? 'Oui' : 'Non'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-center py-4">Aucune session</p>
                    )}
                  </div>

                  {/* Bar Orders */}
                  <div className="bg-black/30 rounded-2xl p-4">
                    <h3 className="text-lg font-bold text-purple-500 mb-4">
                      🍹 Bar ({dayData.bar.count} commandes) - {dayData.bar.formatted_total}
                    </h3>
                    {dayData.bar.orders.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-zinc-500 text-xs uppercase">
                              <th className="text-left py-2">Client</th>
                              <th className="text-left py-2">Articles</th>
                              <th className="text-right py-2">Total</th>
                              <th className="text-center py-2">Payé</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayData.bar.orders.map(order => (
                              <tr key={order.id} className="border-t border-white/5">
                                <td className="py-2 font-bold">{order.client_name}</td>
                                <td className="py-2 text-zinc-400">
                                  {order.items.map((item: any) => `${item.name} x${item.quantity}`).join(', ')}
                                </td>
                                <td className="py-2 text-right font-bold text-purple-500">{order.formatted_price}</td>
                                <td className="py-2 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    order.is_paid 
                                      ? 'bg-emerald-500/20 text-emerald-500' 
                                      : 'bg-rose-500/20 text-rose-500'
                                  }`}>
                                    {order.is_paid ? 'Oui' : 'Non'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-center py-4">Aucune commande</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-zinc-500">
                  Chargement...
                </div>
              )
            ) : (
              <div className="text-center py-20 text-zinc-500">
                <p className="text-6xl mb-4">📅</p>
                <p>Sélectionnez un jour pour voir les détails</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agenda;
