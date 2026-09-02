/**
 * @file app.js
 * @description Controlador de interfaz de usuario y eventos para CrediNova Perú.
 * Conecta el Motor Financiero SBS con la vista interactiva, gestiona estados,
 * simulación de amortización anticipada (prepago), EWA y exportación a CSV/PDF.
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // =========================================================================
  const state = {
    currentLoan: null,
    currentSchedule: [],
    originalLoan: null,
    isPrepaymentActive: false,
    selectedModality: 'REDUCIR_PLAZO',
    ewaRequest: {
      salarioNetoMensual: 3000,
      diasTrabajados: 15,
      porcentajeMaximoPermitido: 0.50,
      montoSolicitado: 500,
      tarifaServicioFija: 15.00,
      tasaIGV: 0.18
    }
  };

  // =========================================================================
  // REFERENCIAS DEL DOM
  // =========================================================================
  // Navegación Tabs
  const tabBtnLoans = document.getElementById('tabBtnLoans');
  const tabBtnEWA = document.getElementById('tabBtnEWA');
  const loansPanel = document.getElementById('loansPanel');
  const ewaPanel = document.getElementById('ewaPanel');

  // Préstamos Inputs
  const loanAmountInput = document.getElementById('loanAmount');
  const loanTermInput = document.getElementById('loanTerm');
  const rangeTerm = document.getElementById('rangeTerm');
  const loanTEAInput = document.getElementById('loanTEA');
  const dueDaySelect = document.getElementById('dueDay');
  const btnRecalculateLoan = document.getElementById('btnRecalculateLoan');

  // Préstamos Displays
  const txtAmountDisplay = document.getElementById('txtAmountDisplay');
  const txtTermDisplay = document.getElementById('txtTermDisplay');
  const txtTeaDisplay = document.getElementById('txtTeaDisplay');
  const temBadge = document.getElementById('temBadge');

  // KPI Préstamo
  const kpiCuotaFija = document.getElementById('kpiCuotaFija');
  const kpiInteresTotal = document.getElementById('kpiInteresTotal');
  const kpiRatioInteres = document.getElementById('kpiRatioInteres');
  const kpiCostoTotal = document.getElementById('kpiCostoTotal');
  const kpiTEM = document.getElementById('kpiTEM');
  const badgeScheduleStatus = document.getElementById('badgeScheduleStatus');

  // Tabla
  const scheduleTableBody = document.getElementById('scheduleTableBody');

  // Prepago SBS
  const prepayInstallmentSelect = document.getElementById('prepayInstallmentSelect');
  const prepayAmountInput = document.getElementById('prepayAmountInput');
  const lblPrepaySaldoRef = document.getElementById('lblPrepaySaldoRef');
  const lblPrepayMaxLimit = document.getElementById('lblPrepayMaxLimit');
  const modalityPlazo = document.getElementById('modalityPlazo');
  const modalityCuota = document.getElementById('modalityCuota');
  const btnApplyPrepayment = document.getElementById('btnApplyPrepayment');
  const btnResetPrepayment = document.getElementById('btnResetPrepayment');
  const btnOpenPrepayModal = document.getElementById('btnOpenPrepayModal');
  const prepaymentSection = document.getElementById('prepaymentSection');
  const comparisonBanner = document.getElementById('comparisonBanner');
  const cmpAhorroInteres = document.getElementById('cmpAhorroInteres');
  const cmpAhorroPct = document.getElementById('cmpAhorroPct');
  const cmpNuevoInteres = document.getElementById('cmpNuevoInteres');
  const cmpInteresOriginalRef = document.getElementById('cmpInteresOriginalRef');
  const cmpImpactoLabel = document.getElementById('cmpImpactoLabel');
  const cmpImpactoValor = document.getElementById('cmpImpactoValor');
  const cmpImpactoSub = document.getElementById('cmpImpactoSub');

  // Exportaciones
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnPrintPDF = document.getElementById('btnPrintPDF');
  const printDate = document.getElementById('printDate');

  // EWA Inputs & Displays
  const ewaSalaryInput = document.getElementById('ewaSalary');
  const ewaDaysInput = document.getElementById('ewaDaysWorked');
  const rangeEwaDays = document.getElementById('rangeEwaDays');
  const ewaMaxPercentSelect = document.getElementById('ewaMaxPercent');
  const ewaFlatFeeInput = document.getElementById('ewaFlatFee');
  const ewaWithdrawInput = document.getElementById('ewaWithdrawAmount');
  const rangeEwaWithdraw = document.getElementById('rangeEwaWithdraw');
  const btnCalculateEWA = document.getElementById('btnCalculateEWA');

  const txtEwaSalaryDisplay = document.getElementById('txtEwaSalaryDisplay');
  const txtEwaDaysDisplay = document.getElementById('txtEwaDaysDisplay');
  const txtEwaPercentDisplay = document.getElementById('txtEwaPercentDisplay');
  const txtEwaWithdrawDisplay = document.getElementById('txtEwaWithdrawDisplay');

  const ewaCupoValue = document.getElementById('ewaCupoValue');
  const txtDevengadoRef = document.getElementById('txtDevengadoRef');
  const valDevengadoTotal = document.getElementById('valDevengadoTotal');
  const ewaProgressBar = document.getElementById('ewaProgressBar');
  const txtProgressPercent = document.getElementById('txtProgressPercent');
  const txtMaxCupoLabel = document.getElementById('txtMaxCupoLabel');

  const kpiEwaNetoRecibir = document.getElementById('kpiEwaNetoRecibir');
  const kpiEwaCostoServicio = document.getElementById('kpiEwaCostoServicio');
  const kpiEwaTotalDescuento = document.getElementById('kpiEwaTotalDescuento');
  const kpiEwaCompromiso = document.getElementById('kpiEwaCompromiso');

  const vchFechaCorte = document.getElementById('vchFechaCorte');
  const vchSalario = document.getElementById('vchSalario');
  const vchDias = document.getElementById('vchDias');
  const vchAdelanto = document.getElementById('vchAdelanto');
  const vchTarifa = document.getElementById('vchTarifa');
  const vchIGV = document.getElementById('vchIGV');
  const vchTotalDescuento = document.getElementById('vchTotalDescuento');
  const btnApproveEWA = document.getElementById('btnApproveEWA');
  const btnExportEWAPDF = document.getElementById('btnExportEWAPDF');

  // =========================================================================
  // TOAST NOTIFICATIONS HELPER
  // =========================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // =========================================================================
  // NAVEGACIÓN ENTRE TABS
  // =========================================================================
  function switchTab(tabId) {
    if (tabId === 'loansPanel') {
      tabBtnLoans.classList.add('active');
      tabBtnEWA.classList.remove('active');
      loansPanel.classList.add('active');
      ewaPanel.classList.remove('active');
    } else {
      tabBtnEWA.classList.add('active');
      tabBtnLoans.classList.remove('active');
      ewaPanel.classList.add('active');
      loansPanel.classList.remove('active');
      updateEWADashboard();
    }
  }

  tabBtnLoans.addEventListener('click', () => switchTab('loansPanel'));
  tabBtnEWA.addEventListener('click', () => switchTab('ewaPanel'));

  // =========================================================================
  // MÓDULO PRÉSTAMOS PERSONALES (SISTEMA FRANCÉS SBS)
  // =========================================================================
  function getLoanInputs() {
    return {
      principal: parseFloat(loanAmountInput.value) || 10000,
      term: parseInt(loanTermInput.value, 10) || 12,
      tea: (parseFloat(loanTEAInput.value) || 25) / 100,
      dueDay: parseInt(dueDaySelect.value, 10) || 30
    };
  }

  function calculateAndRenderLoan() {
    const { principal, term, tea, dueDay } = getLoanInputs();

    // Actualizar badges e indicadores visuales de tasa
    const tem = FinancialMath.teaToTem(tea);
    const temFormatted = FinancialMath.formatPercentage(tem, 4);
    temBadge.textContent = `TEM: ${temFormatted}`;
    kpiTEM.textContent = temFormatted;
    txtAmountDisplay.textContent = FinancialMath.formatCurrency(principal);
    txtTermDisplay.textContent = `${term} meses`;
    txtTeaDisplay.textContent = `${(tea * 100).toFixed(2)}%`;

    // Generar cronograma
    const loan = LoanEngine.generateSchedule(principal, tea, term, dueDay);
    state.currentLoan = loan;
    state.originalLoan = loan;
    state.currentSchedule = loan.cronograma;
    state.isPrepaymentActive = false;

    // Actualizar KPIs
    kpiCuotaFija.textContent = FinancialMath.formatCurrency(loan.cuotaMensualFija);
    kpiInteresTotal.textContent = FinancialMath.formatCurrency(loan.interesTotal);
    const ratioInteres = ((loan.interesTotal / loan.montoCapital) * 100).toFixed(1);
    kpiRatioInteres.textContent = `${ratioInteres}% del capital`;
    kpiCostoTotal.textContent = FinancialMath.formatCurrency(loan.costoTotalCredito);

    // Ocultar banner de prepago activo
    badgeScheduleStatus.style.display = 'none';
    comparisonBanner.style.display = 'none';

    // Renderizar tabla y selector de prepago
    renderScheduleTable(loan.cronograma);
    populatePrepaymentInstallmentSelect(loan.cronograma);
  }

  function renderScheduleTable(schedule) {
    scheduleTableBody.innerHTML = '';

    schedule.forEach(cuota => {
      const tr = document.createElement('tr');
      if (cuota.esPrepago) {
        tr.className = 'row-prepayment';
      }

      let extraBadge = '';
      if (cuota.esPrepago) {
        extraBadge = `<span class="tag-prepago">PREPAGO +${FinancialMath.formatCurrency(cuota.montoPrepagoExtra)}</span>`;
      }

      tr.innerHTML = `
        <td><strong>#${cuota.numeroCuota}</strong>${extraBadge}</td>
        <td>${cuota.fechaVencimiento}</td>
        <td>${FinancialMath.formatCurrency(cuota.saldoInicial)}</td>
        <td><strong>${FinancialMath.formatCurrency(cuota.cuotaTotal)}</strong></td>
        <td style="color: #93c5fd;">${FinancialMath.formatCurrency(cuota.interes)}</td>
        <td style="color: #6ee7b7;">${FinancialMath.formatCurrency(cuota.amortizacionCapital)}</td>
        <td style="font-weight: 700;">${FinancialMath.formatCurrency(cuota.saldoFinal)}</td>
      `;
      scheduleTableBody.appendChild(tr);
    });
  }

  function populatePrepaymentInstallmentSelect(schedule) {
    prepayInstallmentSelect.innerHTML = '';
    
    // Solo se puede prepagar en cuotas anteriores a la última o con saldo > 0
    const cuotasPrepagables = schedule.filter(c => c.saldoFinal > 0);

    cuotasPrepagables.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.numeroCuota;
      opt.textContent = `Cuota #${c.numeroCuota} (${c.fechaVencimiento}) - Saldo: ${FinancialMath.formatCurrency(c.saldoFinal)}`;
      prepayInstallmentSelect.appendChild(opt);
    });

    // Seleccionar por defecto la cuota 3 o 4 (o la mitad del plazo)
    if (cuotasPrepagables.length > 3) {
      prepayInstallmentSelect.value = 4;
    } else if (cuotasPrepagables.length > 0) {
      prepayInstallmentSelect.value = cuotasPrepagables[0].numeroCuota;
    }

    updatePrepaymentLimits();
  }

  function updatePrepaymentLimits() {
    const selectedCuotaNum = parseInt(prepayInstallmentSelect.value, 10);
    if (!state.originalLoan || isNaN(selectedCuotaNum)) return;

    const cuotaTarget = state.originalLoan.cronograma.find(c => c.numeroCuota === selectedCuotaNum);
    if (!cuotaTarget) return;

    const maxExtra = cuotaTarget.saldoFinal;
    lblPrepaySaldoRef.textContent = `Saldo post-cuota: ${FinancialMath.formatCurrency(maxExtra)}`;
    lblPrepayMaxLimit.textContent = `Máx a cancelar: ${FinancialMath.formatCurrency(maxExtra)}`;

    // Si el input actual excede el saldo remanente, sugerir un valor representativo
    const currentVal = parseFloat(prepayAmountInput.value) || 0;
    if (currentVal > maxExtra || currentVal <= 0) {
      prepayAmountInput.value = Math.min(3000, Math.floor(maxExtra / 2));
    }
  }

  // =========================================================================
  // SIMULADOR DE AMORTIZACIÓN ANTICIPADA (PREPAGO SBS)
  // =========================================================================
  modalityPlazo.addEventListener('click', () => {
    state.selectedModality = 'REDUCIR_PLAZO';
    modalityPlazo.classList.add('active');
    modalityCuota.classList.remove('active');
  });

  modalityCuota.addEventListener('click', () => {
    state.selectedModality = 'REDUCIR_CUOTA';
    modalityCuota.classList.add('active');
    modalityPlazo.classList.remove('active');
  });

  prepayInstallmentSelect.addEventListener('change', updatePrepaymentLimits);

  btnApplyPrepayment.addEventListener('click', () => {
    try {
      const cuotaNum = parseInt(prepayInstallmentSelect.value, 10);
      const extraAmount = parseFloat(prepayAmountInput.value);

      if (!extraAmount || extraAmount <= 0) {
        showToast('Debe ingresar un monto válido a amortizar.', 'warning');
        return;
      }

      const prepayResult = LoanEngine.simulatePrepayment(state.originalLoan, {
        numeroCuotaPago: cuotaNum,
        montoPrepagoExtraordinario: extraAmount,
        modalidad: state.selectedModality
      });

      // Actualizar estado
      state.isPrepaymentActive = true;
      state.currentSchedule = prepayResult.nuevoCronograma;

      // Reflejar en la tabla
      renderScheduleTable(prepayResult.nuevoCronograma);
      badgeScheduleStatus.style.display = 'inline-flex';

      // Mostrar métricas comparativas
      comparisonBanner.style.display = 'grid';
      cmpAhorroInteres.textContent = FinancialMath.formatCurrency(prepayResult.ahorroInteresTotal);
      
      const pctAhorro = ((prepayResult.ahorroInteresTotal / state.originalLoan.interesTotal) * 100).toFixed(1);
      cmpAhorroPct.textContent = `${pctAhorro}% de ahorro en intereses`;

      cmpNuevoInteres.textContent = FinancialMath.formatCurrency(prepayResult.nuevoInteresTotal);
      cmpInteresOriginalRef.textContent = `Antes: ${FinancialMath.formatCurrency(state.originalLoan.interesTotal)}`;

      if (state.selectedModality === 'REDUCIR_PLAZO') {
        cmpImpactoLabel.textContent = 'Meses Ahorrados';
        cmpImpactoValor.textContent = `${prepayResult.mesesAhorrados} meses menos`;
        cmpImpactoSub.textContent = `Nuevo plazo total: ${prepayResult.nuevoPlazoMeses} meses`;
      } else {
        cmpImpactoLabel.textContent = 'Nueva Cuota Reducida';
        cmpImpactoValor.textContent = FinancialMath.formatCurrency(prepayResult.nuevaCuotaMensual);
        cmpImpactoSub.textContent = `Cuota anterior: ${FinancialMath.formatCurrency(prepayResult.cuotaOriginal)}`;
      }

      // Scroll suave a la tabla
      document.getElementById('scheduleTable').scrollIntoView({ behavior: 'smooth', block: 'start' });

      showToast(`¡Prepago aplicado con éxito! Ahorro de intereses: ${FinancialMath.formatCurrency(prepayResult.ahorroInteresTotal)}`, 'success');

    } catch (err) {
      showToast(err.message, 'warning');
    }
  });

  btnResetPrepayment.addEventListener('click', () => {
    if (!state.originalLoan) return;
    state.isPrepaymentActive = false;
    state.currentSchedule = state.originalLoan.cronograma;
    renderScheduleTable(state.originalLoan.cronograma);
    badgeScheduleStatus.style.display = 'none';
    comparisonBanner.style.display = 'none';
    showToast('Cronograma restablecido a condiciones originales.', 'info');
  });

  btnOpenPrepayModal.addEventListener('click', () => {
    prepaymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    prepayAmountInput.focus();
  });

  // =========================================================================
  // EVENTOS DE ENTRADA Y PRESETS (PRÉSTAMOS)
  // =========================================================================
  loanTermInput.addEventListener('input', () => {
    rangeTerm.value = loanTermInput.value;
    calculateAndRenderLoan();
  });

  rangeTerm.addEventListener('input', () => {
    loanTermInput.value = rangeTerm.value;
    calculateAndRenderLoan();
  });

  loanAmountInput.addEventListener('input', calculateAndRenderLoan);
  loanTEAInput.addEventListener('input', calculateAndRenderLoan);
  dueDaySelect.addEventListener('change', calculateAndRenderLoan);
  btnRecalculateLoan.addEventListener('click', () => {
    calculateAndRenderLoan();
    showToast('Cronograma oficial recalculado con éxito.', 'success');
  });

  // Chip Presets de Préstamo
  document.querySelectorAll('[data-set-amount]').forEach(btn => {
    btn.addEventListener('click', () => {
      loanAmountInput.value = btn.getAttribute('data-set-amount');
      calculateAndRenderLoan();
    });
  });

  document.querySelectorAll('[data-set-term]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-set-term');
      loanTermInput.value = t;
      rangeTerm.value = t;
      calculateAndRenderLoan();
    });
  });

  document.querySelectorAll('[data-set-tea]').forEach(btn => {
    btn.addEventListener('click', () => {
      loanTEAInput.value = btn.getAttribute('data-set-tea');
      calculateAndRenderLoan();
    });
  });

  // =========================================================================
  // EXPORTACIÓN A CSV Y PDF
  // =========================================================================
  btnExportCSV.addEventListener('click', () => {
    if (!state.currentSchedule || state.currentSchedule.length === 0) return;

    let csvContent = '\uFEFF'; // BOM para compatibilidad con Microsoft Excel en español
    csvContent += 'Nro Cuota,Fecha Vencimiento,Saldo Inicial (PEN),Cuota Total (PEN),Interes (PEN),Amortizacion (PEN),Saldo Final (PEN),Prepago Extra (PEN)\n';

    state.currentSchedule.forEach(c => {
      csvContent += `${c.numeroCuota},"${c.fechaVencimiento}",${c.saldoInicial.toFixed(2)},${c.cuotaTotal.toFixed(2)},${c.interes.toFixed(2)},${c.amortizacionCapital.toFixed(2)},${c.saldoFinal.toFixed(2)},${(c.montoPrepagoExtra || 0).toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cronograma_prestamo_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Archivo CSV exportado correctamente.', 'success');
  });

  btnPrintPDF.addEventListener('click', () => {
    const today = new Date();
    printDate.textContent = `Generado el: ${today.toLocaleDateString('es-PE')} ${today.toLocaleTimeString('es-PE')}`;
    window.print();
  });

  // =========================================================================
  // MÓDULO ADELANTO DE SALARIO (EARNED WAGE ACCESS - EWA)
  // =========================================================================
  function updateEWADashboard() {
    const salary = parseFloat(ewaSalaryInput.value) || 3000;
    const daysWorked = parseInt(ewaDaysInput.value, 10) || 15;
    const maxPercent = parseFloat(ewaMaxPercentSelect.value) || 0.50;
    const flatFee = parseFloat(ewaFlatFeeInput.value) || 15.00;
    let withdrawAmount = parseFloat(ewaWithdrawInput.value) || 500;

    // Actualizar etiquetas visuales
    txtEwaSalaryDisplay.textContent = FinancialMath.formatCurrency(salary);
    txtEwaDaysDisplay.textContent = `${daysWorked} días`;
    txtEwaPercentDisplay.textContent = `${(maxPercent * 100).toFixed(0)}% del devengado`;

    // 1. Calcular devengado y cupo máximo
    const devengado = FinancialMath.round((salary / 30) * daysWorked);
    const cupoMaximo = FinancialMath.round(devengado * maxPercent);

    // Ajustar límites del slider de retiro
    rangeEwaWithdraw.max = cupoMaximo;
    if (withdrawAmount > cupoMaximo) {
      withdrawAmount = cupoMaximo;
      ewaWithdrawInput.value = cupoMaximo;
      rangeEwaWithdraw.value = cupoMaximo;
    }
    txtEwaWithdrawDisplay.textContent = FinancialMath.formatCurrency(withdrawAmount);

    // 2. Ejecutar cálculo con motor EWA
    const ewaResult = EWAEngine.calculateEWA({
      salarioNetoMensual: salary,
      diasTrabajados: daysWorked,
      porcentajeMaximoPermitido: maxPercent,
      montoSolicitado: withdrawAmount,
      tarifaServicioFija: flatFee,
      tasaIGV: 0.18
    });

    // 3. Renderizar medidor de cupo
    ewaCupoValue.textContent = FinancialMath.formatCurrency(cupoMaximo);
    txtDevengadoRef.textContent = `${daysWorked} días trabajados`;
    valDevengadoTotal.textContent = FinancialMath.formatCurrency(devengado);
    txtMaxCupoLabel.textContent = FinancialMath.formatCurrency(cupoMaximo);

    const usageRatio = cupoMaximo > 0 ? Math.min(100, (withdrawAmount / cupoMaximo) * 100) : 0;
    ewaProgressBar.style.width = `${usageRatio}%`;
    txtProgressPercent.textContent = `${usageRatio.toFixed(1)}% del cupo solicitado`;

    // 4. Renderizar KPIs
    if (ewaResult.esValido) {
      kpiEwaNetoRecibir.textContent = FinancialMath.formatCurrency(ewaResult.montoAprobado);
      kpiEwaCostoServicio.textContent = FinancialMath.formatCurrency(ewaResult.costoTotalServicio);
      kpiEwaTotalDescuento.textContent = FinancialMath.formatCurrency(ewaResult.montoTotalDescuentoPlanilla);
      kpiEwaCompromiso.textContent = `${ewaResult.porcentajeSalarioComprometido}% del salario neto mensual`;

      // 5. Renderizar Comprobante / Voucher de Descuento
      vchFechaCorte.textContent = ewaResult.fechaCortePlanilla;
      vchSalario.textContent = FinancialMath.formatCurrency(salary);
      vchDias.textContent = `${daysWorked} días laborados`;
      vchAdelanto.textContent = FinancialMath.formatCurrency(ewaResult.montoAprobado);
      vchTarifa.textContent = FinancialMath.formatCurrency(ewaResult.tarifaServicio);
      vchIGV.textContent = FinancialMath.formatCurrency(ewaResult.igvTarifa);
      vchTotalDescuento.textContent = FinancialMath.formatCurrency(ewaResult.montoTotalDescuentoPlanilla);
    } else {
      showToast(ewaResult.mensajeError, 'warning');
    }
  }

  // Eventos EWA
  ewaSalaryInput.addEventListener('input', updateEWADashboard);
  ewaDaysInput.addEventListener('input', () => {
    rangeEwaDays.value = ewaDaysInput.value;
    updateEWADashboard();
  });
  rangeEwaDays.addEventListener('input', () => {
    ewaDaysInput.value = rangeEwaDays.value;
    updateEWADashboard();
  });
  ewaMaxPercentSelect.addEventListener('change', updateEWADashboard);
  ewaFlatFeeInput.addEventListener('input', updateEWADashboard);

  ewaWithdrawInput.addEventListener('input', () => {
    rangeEwaWithdraw.value = ewaWithdrawInput.value;
    updateEWADashboard();
  });
  rangeEwaWithdraw.addEventListener('input', () => {
    ewaWithdrawInput.value = rangeEwaWithdraw.value;
    updateEWADashboard();
  });

  btnCalculateEWA.addEventListener('click', () => {
    updateEWADashboard();
    showToast('Simulación de liquidación EWA actualizada.', 'success');
  });

  btnApproveEWA.addEventListener('click', () => {
    showToast('¡Orden de Descuento en Planilla aprobada y enviada al área de RRHH!', 'success');
  });

  btnExportEWAPDF.addEventListener('click', () => {
    window.print();
  });

  // Presets de Salario
  document.querySelectorAll('[data-set-salary]').forEach(btn => {
    btn.addEventListener('click', () => {
      ewaSalaryInput.value = btn.getAttribute('data-set-salary');
      updateEWADashboard();
    });
  });

  // Presets de Días Laborados
  document.querySelectorAll('[data-set-days]').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.getAttribute('data-set-days');
      ewaDaysInput.value = d;
      rangeEwaDays.value = d;
      updateEWADashboard();
    });
  });

  // =========================================================================
  // INICIALIZACIÓN AUTOMÁTICA
  // =========================================================================
  calculateAndRenderLoan();
  updateEWADashboard();
});
