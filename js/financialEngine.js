/**
 * @file financialEngine.js
 * @description Motor matemático y financiero de nivel bancario bajo normativa de la SBS (Perú).
 * Incluye:
 * 1. Utilidades de precisión financiera y redondeo contable bancario (HALF_EVEN).
 * 2. Conversión de tasas efectivas periódicas (Base 30/360 SBS).
 * 3. Motor de Sistema Francés con ajuste residual de centavos.
 * 4. Motor de Amortización Anticipada (Prepago) - Res. SBS N° 3274-2017.
 * 5. Motor de Adelanto de Salario (Earned Wage Access - EWA).
 */

class FinancialMath {
  /**
   * Redondeo financiero bancario (Half-Even / Banker's Rounding) a 2 decimales.
   * Evita el sesgo estadístico acumulativo en cronogramas crediticios.
   * @param {number} value - Valor numérico a redondear
   * @param {number} [decimals=2] - Número de decimales (por defecto 2)
   * @returns {number}
   */
  static round(value, decimals = 2) {
    if (isNaN(value) || !isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    const n = +(value * factor).toFixed(8);
    const i = Math.floor(n);
    const f = n - i;
    const epsilon = 1e-8;

    let rounded;
    if (Math.abs(f - 0.5) < epsilon) {
      // Si la fracción es exactamente 0.5, redondea al entero par más cercano
      rounded = (i % 2 === 0) ? i : i + 1;
    } else {
      rounded = Math.round(n);
    }
    return rounded / factor;
  }

  /**
   * Convierte Tasa Efectiva Anual (TEA) a Tasa Efectiva Mensual (TEM).
   * Normativa SBS Perú: Base estándar 30/360 días:
   * TEM = (1 + TEA)^(30/360) - 1 = (1 + TEA)^(1/12) - 1
   * @param {number} tea - Tasa Efectiva Anual en formato decimal (ej: 0.25 para 25%)
   * @returns {number} TEM en formato decimal
   */
  static teaToTem(tea) {
    if (tea <= 0) return 0;
    return Math.pow(1 + tea, 30 / 360) - 1;
  }

  /**
   * Convierte Tasa Efectiva Mensual (TEM) a Tasa Efectiva Anual (TEA).
   * TEA = (1 + TEM)^12 - 1
   * @param {number} tem - Tasa Efectiva Mensual en formato decimal
   * @returns {number} TEA en formato decimal
   */
  static temToTea(tem) {
    if (tem <= 0) return 0;
    return Math.pow(1 + tem, 360 / 30) - 1;
  }

  /**
   * Calcula la cuota constante periódica bajo Sistema Francés:
   * Cuota = P * [TEM * (1 + TEM)^n] / [(1 + TEM)^n - 1]
   * @param {number} principal - Monto de capital (P)
   * @param {number} tem - Tasa Efectiva Mensual en decimal
   * @param {number} n - Plazo en número de cuotas (meses)
   * @returns {number} Cuota periódica uniforme
   */
  static calculateFrenchInstallment(principal, tem, n) {
    if (n <= 0 || principal <= 0) return 0;
    if (tem === 0) return this.round(principal / n);
    const factor = Math.pow(1 + tem, n);
    const cuota = principal * (tem * factor) / (factor - 1);
    return this.round(cuota);
  }

  /**
   * Formatea un valor numérico a moneda Soles (S/.) con separadores de miles y 2 decimales.
   * @param {number} amount - Importe a formatear
   * @returns {string} Ejemplo: "S/. 1,250.00"
   */
  static formatCurrency(amount) {
    const valid = isNaN(amount) ? 0 : amount;
    return 'S/. ' + valid.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Formatea un ratio decimal a porcentaje con 2 o 4 decimales.
   * @param {number} rate - Tasa en decimal (ej: 0.0221)
   * @param {number} [decimals=2] - Cantidad de decimales
   * @returns {string} Ejemplo: "2.21%" o "2.2104%"
   */
  static formatPercentage(rate, decimals = 2) {
    const valid = isNaN(rate) ? 0 : rate;
    return (valid * 100).toFixed(decimals) + '%';
  }

  /**
   * Suma meses a una fecha respetando el día de corte/vencimiento.
   * @param {Date} baseDate - Fecha inicial
   * @param {number} monthsToAdd - Cantidad de meses a sumar
   * @param {number} preferredDay - Día del mes deseado (1 a 31)
   * @returns {string} Fecha en formato DD/MM/YYYY
   */
  static addMonthsToDate(baseDate, monthsToAdd, preferredDay = 30) {
    const d = new Date(baseDate.getTime());
    d.setDate(1); // Evitar salto de mes en días 29-31
    d.setMonth(d.getMonth() + monthsToAdd);
    
    // Obtener el último día válido para el mes resultante
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(preferredDay, lastDayOfMonth);
    d.setDate(targetDay);

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}

/**
 * Motor de Préstamos Personales (Sistema Francés SBS)
 */
class LoanEngine {
  /**
   * Genera el cronograma de pagos oficial según Sistema Francés con ajuste residual bancario.
   * @param {number} principal - Capital a prestar en Soles (S/.)
   * @param {number} tea - Tasa Efectiva Anual en decimal (ej: 0.28 para 28%)
   * @param {number} n - Plazo en meses
   * @param {number} [dueDay=30] - Día de pago mensual
   * @param {Date} [disbursementDate=new Date()] - Fecha de desembolso
   * @returns {Loan}
   */
  static generateSchedule(principal, tea, n, dueDay = 30, disbursementDate = new Date()) {
    const tem = FinancialMath.teaToTem(tea);
    const cuotaFija = FinancialMath.calculateFrenchInstallment(principal, tem, n);
    
    /** @type {Installment[]} */
    const cronograma = [];
    let saldoActual = principal;
    let interesTotal = 0;

    for (let k = 1; k <= n; k++) {
      const saldoInicial = FinancialMath.round(saldoActual);
      const interesPeriodo = FinancialMath.round(saldoInicial * tem);
      let amortizacionPeriodo = 0;
      let cuotaPeriodo = 0;
      let saldoFinal = 0;

      if (k === n) {
        // Cuota final: Ajuste residual estricto exigido por auditoría SBS
        // La amortización absorbe exactamente el saldo deudor remanente
        amortizacionPeriodo = saldoInicial;
        cuotaPeriodo = FinancialMath.round(amortizacionPeriodo + interesPeriodo);
        saldoFinal = 0;
      } else {
        amortizacionPeriodo = FinancialMath.round(cuotaFija - interesPeriodo);
        // Si por redondeo la amortización superase el saldo:
        if (amortizacionPeriodo > saldoInicial) {
          amortizacionPeriodo = saldoInicial;
        }
        cuotaPeriodo = FinancialMath.round(amortizacionPeriodo + interesPeriodo);
        saldoFinal = FinancialMath.round(saldoInicial - amortizacionPeriodo);
      }

      saldoActual = saldoFinal;
      interesTotal = FinancialMath.round(interesTotal + interesPeriodo);

      const fechaVencimiento = FinancialMath.addMonthsToDate(disbursementDate, k, dueDay);

      cronograma.push({
        numeroCuota: k,
        fechaVencimiento,
        saldoInicial,
        cuotaTotal: cuotaPeriodo,
        interes: interesPeriodo,
        amortizacionCapital: amortizacionPeriodo,
        saldoFinal,
        esPrepago: false,
        montoPrepagoExtra: 0,
        cuotaOriginal: cuotaFija
      });
    }

    return {
      id: 'LOAN-' + Date.now().toString(36).toUpperCase(),
      montoCapital: principal,
      plazoMeses: n,
      tea,
      tem,
      cuotaMensualFija: cuotaFija,
      diaVencimiento: dueDay,
      fechaDesembolso: disbursementDate.toISOString(),
      cronograma,
      interesTotal: FinancialMath.round(interesTotal),
      costoTotalCredito: FinancialMath.round(principal + interesTotal)
    };
  }

  /**
   * Simula un prepago extraordinario (Amortización Anticipada) conforme a la Res. SBS N° 3274-2017.
   * Regla de imputación legal:
   * 1. En la cuota k elegida, se paga la cuota ordinaria normal (intereses corridos + amortización regular).
   * 2. El monto extraordinario amortiza 100% el saldo de capital sin penalidades ni comisiones.
   * 3. El usuario opta por:
   *    - REDUCIR_PLAZO: Mantiene cuota original, cancela antes el préstamo.
   *    - REDUCIR_CUOTA: Mantiene plazo restante (n - k), reduce la cuota mensual.
   * 
   * @param {Loan} loan - Objeto de préstamo original
   * @param {PrepaymentRequest} request - Parámetros del prepago
   * @param {Date} [disbursementDate=new Date()] - Fecha base para proyección de fechas
   * @returns {PrepaymentResult}
   */
  static simulatePrepayment(loan, request, disbursementDate = new Date()) {
    const { numeroCuotaPago, montoPrepagoExtraordinario, modalidad } = request;
    const { cronograma, tem, tea, cuotaMensualFija, diaVencimiento } = loan;

    if (numeroCuotaPago < 1 || numeroCuotaPago > cronograma.length) {
      throw new Error(`La cuota de prepago (${numeroCuotaPago}) debe estar entre 1 y ${cronograma.length}.`);
    }

    // Identificar el saldo deudor remanente luego de pagar la cuota ordinaria k
    const cuotaTarget = cronograma[numeroCuotaPago - 1];
    const saldoPostCuotaOrdinaria = cuotaTarget.saldoFinal;

    if (montoPrepagoExtraordinario <= 0) {
      throw new Error('El monto de amortización anticipada debe ser mayor a 0.');
    }

    // Validar tope de prepago
    const montoEfectivoPrepago = Math.min(montoPrepagoExtraordinario, saldoPostCuotaOrdinaria);
    const nuevoSaldoDeudor = FinancialMath.round(saldoPostCuotaOrdinaria - montoEfectivoPrepago);

    /** @type {Installment[]} */
    const nuevoCronograma = [];

    // 1. Copiar cuotas históricas previas a la cuota de prepago
    for (let i = 0; i < numeroCuotaPago - 1; i++) {
      nuevoCronograma.push({ ...cronograma[i] });
    }

    // 2. Modificar la cuota k en la que ocurre el prepago
    nuevoCronograma.push({
      ...cuotaTarget,
      esPrepago: true,
      montoPrepagoExtra: montoEfectivoPrepago,
      cuotaTotal: FinancialMath.round(cuotaTarget.cuotaTotal + montoEfectivoPrepago),
      amortizacionCapital: FinancialMath.round(cuotaTarget.amortizacionCapital + montoEfectivoPrepago),
      saldoFinal: nuevoSaldoDeudor
    });

    let nuevoPlazoTotal = numeroCuotaPago;
    let nuevaCuotaMensual = cuotaMensualFija;
    let mesesAhorrados = 0;

    // Si con el prepago se extingue la totalidad de la deuda:
    if (nuevoSaldoDeudor <= 0) {
      nuevoPlazoTotal = numeroCuotaPago;
      mesesAhorrados = cronograma.length - numeroCuotaPago;
      nuevaCuotaMensual = 0;
    } else if (modalidad === 'REDUCIR_PLAZO') {
      // OPCIÓN A: REDUCCIÓN DE PLAZO (Mantiene cuota fija, recalcula plazo restante m)
      let saldoRestante = nuevoSaldoDeudor;
      let k = numeroCuotaPago + 1;

      while (saldoRestante > 0.01) {
        const saldoInicial = FinancialMath.round(saldoRestante);
        const interes = FinancialMath.round(saldoInicial * tem);
        
        let amortizacion = FinancialMath.round(cuotaMensualFija - interes);
        let cuotaActual = cuotaMensualFija;
        let saldoFinal = 0;

        // Si la amortización ordinaria cubre o supera el saldo restante:
        if (amortizacion >= saldoInicial) {
          amortizacion = saldoInicial;
          cuotaActual = FinancialMath.round(amortizacion + interes);
          saldoFinal = 0;
          saldoRestante = 0;
        } else {
          saldoFinal = FinancialMath.round(saldoInicial - amortizacion);
          saldoRestante = saldoFinal;
        }

        const fechaVencimiento = FinancialMath.addMonthsToDate(disbursementDate, k, diaVencimiento);

        nuevoCronograma.push({
          numeroCuota: k,
          fechaVencimiento,
          saldoInicial,
          cuotaTotal: cuotaActual,
          interes,
          amortizacionCapital: amortizacion,
          saldoFinal,
          esPrepago: false,
          montoPrepagoExtra: 0,
          cuotaOriginal: cuotaMensualFija
        });

        k++;
      }

      nuevoPlazoTotal = nuevoCronograma.length;
      mesesAhorrados = cronograma.length - nuevoPlazoTotal;
      nuevaCuotaMensual = cuotaMensualFija;

    } else if (modalidad === 'REDUCIR_CUOTA') {
      // OPCIÓN B: REDUCCIÓN DE CUOTA (Mantiene cuotas restantes m = n - k, recalcula cuota fija menor)
      const cuotasRestantes = cronograma.length - numeroCuotaPago;
      nuevaCuotaMensual = FinancialMath.calculateFrenchInstallment(nuevoSaldoDeudor, tem, cuotasRestantes);

      let saldoRestante = nuevoSaldoDeudor;

      for (let step = 1; step <= cuotasRestantes; step++) {
        const k = numeroCuotaPago + step;
        const saldoInicial = FinancialMath.round(saldoRestante);
        const interes = FinancialMath.round(saldoInicial * tem);
        let amortizacion = 0;
        let cuotaPeriodo = 0;
        let saldoFinal = 0;

        if (step === cuotasRestantes) {
          // Última cuota: Liquidación residual
          amortizacion = saldoInicial;
          cuotaPeriodo = FinancialMath.round(amortizacion + interes);
          saldoFinal = 0;
        } else {
          amortizacion = FinancialMath.round(nuevaCuotaMensual - interes);
          if (amortizacion > saldoInicial) amortizacion = saldoInicial;
          cuotaPeriodo = FinancialMath.round(amortizacion + interes);
          saldoFinal = FinancialMath.round(saldoInicial - amortizacion);
        }

        saldoRestante = saldoFinal;
        const fechaVencimiento = FinancialMath.addMonthsToDate(disbursementDate, k, diaVencimiento);

        nuevoCronograma.push({
          numeroCuota: k,
          fechaVencimiento,
          saldoInicial,
          cuotaTotal: cuotaPeriodo,
          interes,
          amortizacionCapital: amortizacion,
          saldoFinal,
          esPrepago: false,
          montoPrepagoExtra: 0,
          cuotaOriginal: cuotaMensualFija
        });
      }

      nuevoPlazoTotal = cronograma.length;
      mesesAhorrados = 0;
    }

    // Calcular totales del nuevo cronograma
    const nuevoInteresTotal = FinancialMath.round(
      nuevoCronograma.reduce((acc, c) => acc + c.interes, 0)
    );
    const ahorroInteresTotal = FinancialMath.round(loan.interesTotal - nuevoInteresTotal);
    const nuevoCostoTotal = FinancialMath.round(loan.montoCapital + nuevoInteresTotal);

    return {
      modalidad,
      cuotaAplicacion: numeroCuotaPago,
      montoAmortizadoCapital: montoEfectivoPrepago,
      nuevoCronograma,
      nuevoInteresTotal,
      ahorroInteresTotal: Math.max(0, ahorroInteresTotal),
      nuevoPlazoMeses: nuevoPlazoTotal,
      mesesAhorrados,
      nuevaCuotaMensual,
      cuotaOriginal: cuotaMensualFija,
      nuevoCostoTotal
    };
  }
}

/**
 * Motor de Adelanto de Sueldo (Earned Wage Access - EWA)
 * Diseñado para empresas peruanas bajo esquemas de deducción en planilla de nómina.
 */
class EWAEngine {
  /**
   * Evalúa y liquida una solicitud de adelanto de salario.
   * @param {EWARequest} request - Datos de la solicitud del colaborador
   * @returns {EWAResult}
   */
  static calculateEWA(request) {
    const {
      salarioNetoMensual,
      diasTrabajados,
      porcentajeMaximoPermitido = 0.50,
      montoSolicitado,
      tarifaServicioFija = 15.00,
      tasaIGV = 0.18
    } = request;

    // 1. Validaciones básicas
    if (salarioNetoMensual <= 0) {
      return this._createErrorResult('El salario neto mensual debe ser mayor a S/. 0.00');
    }
    if (diasTrabajados < 1 || diasTrabajados > 30) {
      return this._createErrorResult('Los días laborados deben encontrarse entre 1 y 30 días.');
    }

    // 2. Cálculo de devengado acumulado a la fecha (Base 30 días laborales estándar en Perú)
    const salarioPorDia = salarioNetoMensual / 30;
    const devengadoAcumulado = FinancialMath.round(salarioPorDia * diasTrabajados);

    // 3. Cupo máximo disponible según política de riesgo
    const cupoMaximoDisponible = FinancialMath.round(devengadoAcumulado * porcentajeMaximoPermitido);

    // 4. Validar monto solicitado
    if (montoSolicitado <= 0) {
      return this._createErrorResult('Debe ingresar un monto de adelanto mayor a S/. 0.00');
    }

    if (montoSolicitado > cupoMaximoDisponible) {
      return {
        devengadoAcumulado,
        cupoMaximoDisponible,
        montoSolicitado,
        montoAprobado: 0,
        tarifaServicio: 0,
        igvTarifa: 0,
        costoTotalServicio: 0,
        montoTotalDescuentoPlanilla: 0,
        porcentajeSalarioComprometido: 0,
        esValido: false,
        mensajeError: `El monto solicitado (${FinancialMath.formatCurrency(montoSolicitado)}) excede su cupo disponible de ${FinancialMath.formatCurrency(cupoMaximoDisponible)}.`,
        fechaCortePlanilla: this._getPayrollCutoffDate()
      };
    }

    // 5. Cálculo de costos de servicio e IGV (18% SUNAT)
    const tarifaServicio = FinancialMath.round(tarifaServicioFija);
    const igvTarifa = FinancialMath.round(tarifaServicio * tasaIGV);
    const costoTotalServicio = FinancialMath.round(tarifaServicio + igvTarifa);

    // 6. Liquidación de nómina (Descuento total en el próximo pago de fin de mes)
    const montoTotalDescuentoPlanilla = FinancialMath.round(montoSolicitado + costoTotalServicio);
    const porcentajeSalarioComprometido = FinancialMath.round((montoTotalDescuentoPlanilla / salarioNetoMensual) * 100, 2);

    return {
      devengadoAcumulado,
      cupoMaximoDisponible,
      montoSolicitado,
      montoAprobado: montoSolicitado,
      tarifaServicio,
      igvTarifa,
      costoTotalServicio,
      montoTotalDescuentoPlanilla,
      porcentajeSalarioComprometido,
      esValido: true,
      fechaCortePlanilla: this._getPayrollCutoffDate()
    };
  }

  /**
   * Helper para obtener la fecha de corte de nómina (último día del mes en curso)
   * @private
   * @returns {string} Fecha DD/MM/YYYY
   */
  static _getPayrollCutoffDate() {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const dd = String(lastDay.getDate()).padStart(2, '0');
    const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${lastDay.getFullYear()}`;
  }

  /**
   * Helper para generar respuesta de error estructurada
   * @private
   */
  static _createErrorResult(mensaje) {
    return {
      devengadoAcumulado: 0,
      cupoMaximoDisponible: 0,
      montoSolicitado: 0,
      montoAprobado: 0,
      tarifaServicio: 0,
      igvTarifa: 0,
      costoTotalServicio: 0,
      montoTotalDescuentoPlanilla: 0,
      porcentajeSalarioComprometido: 0,
      esValido: false,
      mensajeError: mensaje,
      fechaCortePlanilla: this._getPayrollCutoffDate()
    };
  }
}

// Exportación universal (Navegador window y Node.js para testing)
if (typeof window !== 'undefined') {
  window.FinancialMath = FinancialMath;
  window.LoanEngine = LoanEngine;
  window.EWAEngine = EWAEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FinancialMath, LoanEngine, EWAEngine };
}
