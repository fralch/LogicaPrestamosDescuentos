/**
 * @file models.js
 * @description Arquitectura de modelos y tipos de datos para el ecosistema crediticio Fintech en Perú.
 * Cumple con estándares de la Superintendencia de Banca, Seguros y AFP (SBS).
 */

/**
 * @typedef {Object} EWARequest
 * @property {number} salarioNetoMensual - Salario neto regular mensual en Soles (S/.)
 * @property {number} diasTrabajados - Días laborados y devengados en el periodo (1 a 30)
 * @property {number} porcentajeMaximoPermitido - % máximo del devengado retirable (ej. 0.30 a 0.50)
 * @property {number} montoSolicitado - Monto que el colaborador solicita adelantar
 * @property {number} tarifaServicioFija - Tarifa de servicio plana fija en Soles (ej. S/. 15.00)
 * @property {number} tasaIGV - Impuesto General a las Ventas aplicable a la tarifa (0.18)
 */

/**
 * @typedef {Object} EWAResult
 * @property {number} devengadoAcumulado - Monto salarial ganado a la fecha = (Salario / 30) * Días
 * @property {number} cupoMaximoDisponible - Límite de crédito disponible = Devengado * % Permitido
 * @property {number} montoSolicitado - Monto solicitado por el empleado
 * @property {number} montoAprobado - Monto validado y concedido
 * @property {number} tarifaServicio - Tarifa plana cobrada por la plataforma
 * @property {number} igvTarifa - 18% de IGV sobre la tarifa de servicio
 * @property {number} costoTotalServicio - Tarifa + IGV
 * @property {number} montoTotalDescuentoPlanilla - Monto retirado + Costo total del servicio
 * @property {number} porcentajeSalarioComprometido - Ratio de retención en nómina (% del salario neto)
 * @property {boolean} esValido - Indica si la solicitud cumple las políticas de riesgo
 * @property {string} [mensajeError] - Detalle en caso de no calificar
 * @property {string} fechaCortePlanilla - Fecha estimada de la liquidación de nómina (fin de mes)
 */

/**
 * @typedef {Object} Installment
 * @property {number} numeroCuota - Número correlativo de cuota (1 a n)
 * @property {string} fechaVencimiento - Fecha de pago en formato DD/MM/YYYY
 * @property {number} saldoInicial - Saldo deudor de capital al inicio del periodo
 * @property {number} cuotaTotal - Monto total a pagar (Amortización + Interés)
 * @property {number} interes - Interés compensatorio del periodo (SaldoInicial * TEM)
 * @property {number} amortizacionCapital - Amortización neta que reduce el principal
 * @property {number} saldoFinal - Saldo deudor remanente al final del periodo
 * @property {boolean} [esPrepago] - Marca si en esta cuota se ejecutó una amortización anticipada
 * @property {number} [montoPrepagoExtra] - Monto extraordinario de capital amortizado anticipadamente
 * @property {number} [cuotaOriginal] - Cuota original antes de prepago (para comparativas)
 */

/**
 * @typedef {Object} Loan
 * @property {string} id - Identificador único del préstamo
 * @property {number} montoCapital - Monto de capital desembolsado en Soles (P)
 * @property {number} plazoMeses - Plazo contractual en meses (n)
 * @property {number} tea - Tasa Efectiva Anual contractual (ej. 0.25 para 25%)
 * @property {number} tem - Tasa Efectiva Mensual equivalente base 30/360
 * @property {number} cuotaMensualFija - Cuota periódica uniforme calculada por Sistema Francés
 * @property {number} diaVencimiento - Día del mes de pago de las cuotas
 * @property {string} fechaDesembolso - Fecha en que se otorga el crédito
 * @property {Installment[]} cronograma - Lista de cuotas detalladas
 * @property {number} interesTotal - Sumatoria de intereses de todo el cronograma
 * @property {number} costoTotalCredito - Capital + Intereses totales
 */

/**
 * @typedef {'REDUCIR_PLAZO' | 'REDUCIR_CUOTA'} SBSModalidadPrepago
 */

/**
 * @typedef {Object} PrepaymentRequest
 * @property {number} numeroCuotaPago - Cuota ordinaria en la que se efectúa el prepago (k)
 * @property {number} montoPrepagoExtraordinario - Monto adicional en Soles destinado directo a capital
 * @property {SBSModalidadPrepago} modalidad - Opción legal regulada por SBS: 'REDUCIR_PLAZO' o 'REDUCIR_CUOTA'
 */

/**
 * @typedef {Object} PrepaymentResult
 * @property {SBSModalidadPrepago} modalidad - Modalidad aplicada
 * @property {number} cuotaAplicacion - Cuota k en la que se aplicó el prepago
 * @property {number} montoAmortizadoCapital - Monto extraordinario amortizado al capital
 * @property {Installment[]} nuevoCronograma - Nuevo cronograma recalculado
 * @property {number} nuevoInteresTotal - Nuevo interés acumulado a pagar
 * @property {number} ahorroInteresTotal - Ahorro financiero neto en intereses (Original - Nuevo)
 * @property {number} nuevoPlazoMeses - Nuevo número total de meses hasta cancelar la deuda
 * @property {number} [mesesAhorrados] - Cuotas o meses cancelados anticipadamente (en REDUCIR_PLAZO)
 * @property {number} [nuevaCuotaMensual] - Nuevo importe de la cuota mensual (en REDUCIR_CUOTA)
 * @property {number} cuotaOriginal - Cuota mensual anterior
 * @property {number} nuevoCostoTotal - Nuevo costo total del crédito
 */

/**
 * @typedef {'MENSUAL' | 'QUINCENAL' | 'SEMANAL'} PayrollFrequency
 */

/**
 * @typedef {Object} PayrollDeduction
 * @property {number} id - Identificador correlativo del descuento
 * @property {number} numeroCuotaMensual - Cuota del crédito a la que pertenece
 * @property {string} periodoPlanilla - Nombre legible del periodo (ej. "1ª Quincena Mayo 2026")
 * @property {string} fechaPagoNomina - Fecha programada de la boleta de pago (DD/MM/YYYY)
 * @property {number} fraccionCuota - Porcentaje de la cuota mensual retenido (ej. 0.50 para 50%)
 * @property {number} montoRetencion - Importe exacto en Soles a descontar en esa boleta
 * @property {number} saldoCreditoRemanente - Saldo vivo del crédito tras este periodo
 */

// Exportación universal para navegador o Node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {};
}
