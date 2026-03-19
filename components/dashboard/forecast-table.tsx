"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Pencil, Check, X, Loader2, Calendar, CalendarDays, TrendingUp, TrendingDown, BarChart3, Filter, ArrowDownAZ, ListOrdered } from "lucide-react"
import { type ForecastResult, getShortMonthName, formatCurrency, formatPercent } from "@/lib/forecasting"
import { cn } from "@/lib/utils"

const KPI_REVENUE = "TOTAL NET REVENUE"
const KPI_EXPENSE_LINES = new Set(["TOTAL EXPENSES", "TOTAL OVERHEAD ALLOCATIONS"])

// Template order from branchData Excel files (e.g. branchData/2026Budget/8.xlsx) — column 0, row order
const TEMPLATE_ORDER = [
  "PEST CONTROL REVENUE",
  "COMMERCIAL REVENUE",
  "COMMERCIAL BED BUG REVENUE",
  "FLY CONTROL",
  "ORKIN/AIRE",
  "FEMININE HYGIENE",
  "DRAIN MAINTENANCE",
  "SOAK TANK",
  "SUBTOTAL MONTHLY",
  "RESIDENTIAL CONTRACT",
  "VALU PLUS COMM REVENUE",
  "SEASONAL REV  & OTHER",
  "SUBTOTAL/ALTERNATE/SEASONAL",
  "GROSS CONTRACT REVENUE",
  "ALLOWANCES",
  "PC MGMT FAILURE",
  "YEAR IN ADVANCE",
  "PC SALES DISC",
  "TOTAL ALLOWANCES",
  "NET CONTRACT REVENUE",
  "MISCELLANEOUS REVENUE",
  "RESIDENTIAL BED BUG REVENUE",
  "RESIDENTIAL SPECIAL SERVICES",
  "COMMERCIAL SPECIAL SERVICES",
  "PRODUCT SALES",
  "FUMIGATION PC",
  "TOTAL MISC REVENUE",
  "TOTAL NET PC REVENUE",
  "TERMITE (TC) REVENUE",
  "TERMITE TREATING",
  "PRETREAT",
  "INSPECTION FEES",
  "TOTAL NET TC REVENUE",
  "TOTAL NET REVENUE",
  "PAYROLL",
  "DIVISION MANAGER",
  "REGION MANAGER SALARY",
  "BRANCH MANAGER SALARY",
  "QUALITY ASSURANCE",
  "MANAGER TRAINEE",
  "SUBTOTALS MANAGERS",
  "MANAGERS INCENTIVES PAID",
  "MGR INCENTIVE ACCRUED",
  "SUBTOTAL MGR INCENTIVES",
  "OFFICE SALARIES",
  "VAC / HOLIDAY / SICK",
  "OFFICE SAL FLD OT",
  "TEMP OFFICE PERS",
  "SUBTOTAL OFFICE",
  "SUBTOTAL ADMIN PAYROLL",
  "SALESPERSON SALARIES",
  "ASM & NATIONAL SALES SALARIES",
  "SALES COMMISSIONS / BONUS",
  "SALES VAC / HOL / SICK",
  "TECHNICIAN SALES COMMISSION",
  "SUBTOTAL SALES PAYROLL",
  "TECHNICIAN SERVICE SALARIES",
  "TECHNICIAN SERV PRODUCTION",
  "PC VAC / HOL / SICK",
  "PC SERV WAGES - OT",
  "SUBTOTAL SERV PAYROLL",
  "SERV MGR SALARY",
  "SERV MGR BONUS",
  "TOTAL SERVICE WAGES",
  "TOTAL PAYROLL",
  "PERSONNEL RELATED",
  "PAYROLL TAXES",
  "INS-GROUP BENEFITS",
  "INS-GROUP DEDUCTIONS",
  "UNIFORMS",
  "MOVING",
  "TRAINING",
  "PROF RECRUITING",
  "MEDICAL",
  "OTHER PERSONNEL RELATED",
  "TOTAL PERSONNEL EXPENSES",
  "TOTAL EMPL COST",
  "MATERIALS AND SUPPLIES",
  "PC CHEMICALS",
  "FREIGHT IN",
  "PC TOOLS & EQUIPMENT",
  "M&S FLY LIGHTS",
  "SUB TOTAL M&S",
  "COGS PRODUCTS & EQUIPMENT",
  "TOTAL MATERIAL & SUPPLIES",
  "VEHICLE EXPENSES",
  "GASOLINE",
  "TIRES",
  "OIL CHANGE",
  "OTHER OPERATING EXPENSES",
  "TOTAL VEHICLE OPERATING",
  "VEHICLE STANDING EXPENSES",
  "LEASE",
  "DEPRECIATION",
  "VEH GAIN / LOSS",
  "LICENSES / TAXES",
  "TOTAL STAND EXPENSES",
  "TOTAL VEHICLE EXPENSE",
  "AUTO ALLOWANCE",
  "PER USE DEDUCTIONS",
  "TOTAL FLEET",
  "INSURANCE & CLAIMS",
  "VEHICLE ACCIDENT",
  "CLAIMS - GENERAL  LIABILITY",
  "INS - GENERAL LIABILITY",
  "INS - AUTO LIABILITY",
  "INS - WORKERS COMPENSATION",
  "SUBTOTAL INSURANCE & CLAIMS",
  "CATASTROPHIC ACCRUAL",
  "TOTAL INSURANCE & CLAIMS",
  "BAD DEBTS",
  "BAD DEBT EXPENSE",
  "RECOVERIES",
  "SUBTOTAL BAD DEBTS",
  "BAD DEBT ACCRUAL",
  "OUT OF POLICY",
  "TOTAL BAD DEBTS",
  "OTHER EXPENSES",
  "FIXED EXPENSES",
  "ADVERTISING DIRECT",
  "RENT - BRANCH",
  "TAXES PROP/OTHER",
  "TOTAL FIXED EXPENSE",
  "CONTROLLABLE EXPENSES",
  "OFFICE SUPPLIES",
  "PRINTING & FORMS",
  "COMPUTER SUPPLIES",
  "TRAVEL",
  "CONFERENCE",
  "TELEPHONE & UTILITIES",
  "LOCAL CENTRALIZED",
  "LONG DISTANCE CENTRALIZED",
  "CELLULAR TELEPHONE",
  "OTHER COMMUNICATION",
  "SUBTOTAL TELEPHONE",
  "UTILITIES",
  "SUBTOTAL TELE. & UTILITIES",
  "PROFESSIONAL SERVICES",
  "MAINTENANCE & REPAIRS",
  "EQUIPMENT RENTAL",
  "POSTAGE",
  "BANK SERVICE CHARGES",
  "CREDIT CARD SERVICE FEE",
  "MISCELLANEOUS",
  "TOTAL CONTROLLABLE",
  "TOTAL OTHER EXPENSE",
  "TOTAL EXPENSES",
  "CONTRIBUTION B/4 OVERHEAD",
  "OVERHEAD ALLOCATIONS",
  "SALES ALLOCATIONS",
  "QA ALLOCATIONS",
  "AR ALLOCATIONS",
  "DATA PROCESSING ALLOCATIONS",
  "ACCOUNTING ALLOCATIONS",
  "ADVERTISING & MKTG - ALLOCATION",
  "REGION SUPPORT SERVICES",
  "CANADA OVERHEAD ALLOCATIONS",
  "BMT ALLOCATIONS",
  "FLEET ALLOCATIONS",
  "CORPORATE ADMIN ALLOCATIONS",
  "HO ADMIN ALLOCATIONS",
  "HUMAN RESOURCES ALLOCATIONS",
  "INFORMATION TECH. ALLOCATIONS",
  "TOTAL OVERHEAD ALLOCATIONS",
  "OPERATING PROFIT",
  "OVERHEAD ALLOCATION REVERSAL",
  "BONUS OPERATING PROFIT",
  "HOME OFFICE OVERHEAD",
  "ACQUISITION COST",
  "ULTIPRO FEES",
  "EXTERNAL PROFIT",
  "FOREIGN EXCHANGE GAIN/LOSS",
  "ROYALTY FEES",
  "INTEREST EXPENSE ORKIN",
  "CANADIAN TAXES",
  "NON-OP INT EXP/(REV)",
  "NET PROFIT",
]

function normDesc(s: string) {
  return String(s ?? "").toUpperCase().replace(/\s+/g, " ").trim()
}

// Normalize for template matching (handles " - " vs ". " etc.)
function normForMatch(s: string) {
  return normDesc(s).replace(/[\s\-\.]+/g, " ").replace(/\s+/g, " ").trim()
}

function isRevenueLine(description: string) {
  const d = normDesc(description)
  return d === KPI_REVENUE || d.includes("REVENUE")
}

function isExpenseLine(description: string) {
  const d = normDesc(description)
  return !d.includes("REVENUE")
}

function isKpiLine(description: string) {
  const d = normDesc(description)
  return d === KPI_REVENUE || KPI_EXPENSE_LINES.has(d)
}

type ViewMode = "revenue" | "expenses" | "both"

type ForecastTableProps = {
  forecasts: ForecastResult[]
  currentMonth: number
  onUpdateForecast?: (description: string, month: number, newValue: number) => Promise<void>
  editable?: boolean
}

type EditingCell = {
  description: string
  month: number
  currentValue: number
} | null

export function ForecastTable({ 
  forecasts, 
  currentMonth, 
  onUpdateForecast,
  editable = true 
}: ForecastTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [showAllMonths, setShowAllMonths] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("both")
  const [hiddenRows, setHiddenRows] = useState<Set<string>>(new Set())
  const [sortByTemplate, setSortByTemplate] = useState(true)

  // Filter forecasts by view mode
  const filteredForecasts = forecasts.filter((f) => {
    if (viewMode === "revenue") return isRevenueLine(f.description)
    if (viewMode === "expenses") return isExpenseLine(f.description)
    return true
  })

  // Group by description (from filtered forecasts), exclude hidden rows
  const uniqueDescriptions = [...new Set(filteredForecasts.map(f => f.description))]
  const allDescriptions = sortByTemplate
    ? [...uniqueDescriptions].sort((a, b) => {
        const na = normForMatch(a)
        const nb = normForMatch(b)
        const ia = TEMPLATE_ORDER.findIndex((t) => {
          const nt = normForMatch(t)
          return na === nt || na.startsWith(nt + " ") || nt.startsWith(na + " ")
        })
        const ib = TEMPLATE_ORDER.findIndex((t) => {
          const nt = normForMatch(t)
          return nb === nt || nb.startsWith(nt + " ") || nt.startsWith(nb + " ")
        })
        if (ia >= 0 && ib >= 0) return ia - ib
        if (ia >= 0) return -1
        if (ib >= 0) return 1
        return a.localeCompare(b)
      })
    : [...uniqueDescriptions].sort((a, b) => a.localeCompare(b))
  const descriptions = allDescriptions.filter((d) => !hiddenRows.has(d))
  const toggleRow = (desc: string) => {
    setHiddenRows((prev) => {
      const next = new Set(prev)
      if (next.has(desc)) next.delete(desc)
      else next.add(desc)
      return next
    })
  }
  
  // Get months to display: all 12 or only current month
  const months = showAllMonths
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : [currentMonth]

  const handleCellClick = (description: string, month: number, currentValue: number) => {
    if (!editable || !onUpdateForecast) return
    setEditingCell({ description, month, currentValue })
    setEditValue(currentValue.toFixed(2))
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingCell || !onUpdateForecast) return
    
    const newValue = parseFloat(editValue)
    if (isNaN(newValue)) return

    setSaving(true)
    try {
      await onUpdateForecast(editingCell.description, editingCell.month, newValue)
      setEditDialogOpen(false)
      setEditingCell(null)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditDialogOpen(false)
    setEditingCell(null)
    setEditValue("")
  }

  // Total row: sum only KPI lines (totals) to avoid double-counting individual entries
  const totalFilter = (f: ForecastResult) => {
    const d = normDesc(f.description)
    if (viewMode === "revenue") return d === KPI_REVENUE
    if (viewMode === "expenses") return KPI_EXPENSE_LINES.has(d)
    return isKpiLine(f.description)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Sort:</Label>
            <div className="flex rounded-lg border border-input bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setSortByTemplate(true)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  sortByTemplate ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ListOrdered className="h-3.5 w-3.5" />
                Template
              </button>
              <button
                type="button"
                onClick={() => setSortByTemplate(false)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  !sortByTemplate ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ArrowDownAZ className="h-3.5 w-3.5" />
                A–Z
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Show:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  Rows {hiddenRows.size > 0 ? `(${allDescriptions.length - hiddenRows.size}/${allDescriptions.length})` : ""}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 max-h-64 overflow-y-auto" align="start">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Toggle rows to show/hide</p>
                  {allDescriptions.map((desc) => (
                    <label key={desc} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={!hiddenRows.has(desc)}
                        onCheckedChange={() => toggleRow(desc)}
                      />
                      <span className="truncate">{desc}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex rounded-lg border border-input bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("revenue")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "revenue" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setViewMode("expenses")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "expenses" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                Expenses
              </button>
              <button
                type="button"
                onClick={() => setViewMode("both")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "both" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Both
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
            id="show-all-months"
            checked={showAllMonths}
            onCheckedChange={setShowAllMonths}
          />
          <Label htmlFor="show-all-months" className="text-sm font-normal cursor-pointer flex items-center gap-2">
            {showAllMonths ? (
              <>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                All months
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {getShortMonthName(currentMonth)} only
              </>
            )}
          </Label>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Description</TableHead>
              {months.map(month => (
                <TableHead 
                  key={month} 
                  className={cn(
                    "text-center min-w-[100px]",
                    month === currentMonth && "bg-primary/10"
                  )}
                >
                  {getShortMonthName(month)}
                </TableHead>
              ))}
              <TableHead className="text-right min-w-[120px]">YTD Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allDescriptions.map(description => {
              const descForecasts = filteredForecasts.filter(f => f.description === description)
              const ytdTotal = descForecasts.reduce((sum, f) => sum + f.forecastValue, 0)
              const isHidden = hiddenRows.has(description)
              if (isHidden) return null
              
              return (
                <TableRow key={description}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium">
                    {description}
                  </TableCell>
                  {months.map(month => {
                    const forecast = descForecasts.find(f => f.month === month)
                    const isCurrentMonth = month === currentMonth
                    const isPast = month < currentMonth
                    const isEditing = editingCell?.description === description && editingCell?.month === month
                    
                    return (
                      <TableCell 
                        key={month}
                        className={cn(
                          "text-center relative group",
                          isCurrentMonth && "bg-primary/10",
                          isPast && "text-muted-foreground",
                          editable && onUpdateForecast && "cursor-pointer hover:bg-muted/50 transition-colors"
                        )}
                        onClick={() => forecast && handleCellClick(description, month, forecast.forecastValue)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">
                              {forecast ? formatCurrency(forecast.forecastValue) : "-"}
                            </span>
                            {editable && onUpdateForecast && forecast && (
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            )}
                          </div>
                          {forecast && forecast.variancePercent !== 0 && (
                            <Badge 
                              variant={forecast.variancePercent >= 0 ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {formatPercent(forecast.variancePercent)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right font-bold">
                    {formatCurrency(ytdTotal)}
                  </TableCell>
                </TableRow>
              )
            })}
            <TableRow className="bg-muted/50 font-bold">
              <TableCell className="sticky left-0 bg-muted/50 z-10">
                Total{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({viewMode === "revenue" ? "Revenue" : viewMode === "expenses" ? "Expenses" : "Revenue + Expenses"})
                </span>
              </TableCell>
              {months.map(month => {
                const monthTotal = forecasts
                  .filter(f => f.month === month && totalFilter(f))
                  .reduce((sum, f) => sum + f.forecastValue, 0)
                const isCurrentMonth = month === currentMonth
                
                return (
                  <TableCell 
                    key={month}
                    className={cn(
                      "text-center",
                      isCurrentMonth && "bg-primary/10"
                    )}
                  >
                    {formatCurrency(monthTotal)}
                  </TableCell>
                )
              })}
              <TableCell className="text-right">
                {formatCurrency(
                  forecasts
                    .filter(f => totalFilter(f))
                    .reduce((sum, f) => sum + f.forecastValue, 0)
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Forecast</DialogTitle>
            <DialogDescription>
              {editingCell && (
                <>
                  Modify the forecast value for <strong>{editingCell.description}</strong> in{" "}
                  <strong>{getShortMonthName(editingCell.month)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="forecast-value">Forecast Value</Label>
              <Input
                id="forecast-value"
                type="number"
                step="0.01"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave()
                  if (e.key === "Escape") handleCancel()
                }}
                autoFocus
              />
            </div>
            {editingCell && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Original value: {formatCurrency(editingCell.currentValue)}</p>
                {editValue && !isNaN(parseFloat(editValue)) && (
                  <p>
                    Change: {" "}
                    <span className={parseFloat(editValue) >= editingCell.currentValue ? "text-accent" : "text-destructive"}>
                      {parseFloat(editValue) >= editingCell.currentValue ? "+" : ""}
                      {formatCurrency(parseFloat(editValue) - editingCell.currentValue)}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !editValue || isNaN(parseFloat(editValue))}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
