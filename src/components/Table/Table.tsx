import React, { useState, useEffect } from "react";

import { Pagination } from "antd";
import classes from "./Table.module.css";

const fixedColumns = [
  "y0_m01",
  "y0_m02",
  "y0_m03",
  "y0_m04",
  "y0_m05",
  "y0_m06",
  "y0_m07",
  "y0_m08",
  "y0_m09",
  "y0_m10",
  "y0_m11",
  "y0_m12",
  "y1_m01",
  "y1_m02",
  "y1_m03",
  "y1_m04",
  "y1_m05",
  "y1_m06",
  "y1_m07",
  "y1_m08",
  "y1_m09",
  "y1_m10",
  "y1_m11",
  "y1_m12",
];

const monthNames = {
  m01: "янв",
  m02: "фев",
  m03: "мар",
  m04: "апр",
  m05: "май",
  m06: "июн",
  m07: "июл",
  m08: "авг",
  m09: "сен",
  m10: "окт",
  m11: "ноя",
  m12: "дек",
};

interface Year {
  code_year: string;
}

interface Sce {
  code: string;
  id: string;
}

interface Cfo {
  code: string;
  id: string;
}

interface Acct {
  acc_code: string;
  description: string;
  id: string;
}

interface Row {
  p_id?: number;
  acc_desc?: string;
  id?: string;
  [key: string]: string | number | null | undefined;
}

interface EditedCellValue {
  newValue: string;
  originalValue: string | number | null | undefined;
}

interface EditedRows {
  [rowIndex: number]: {
    [column: string]: EditedCellValue;
  };
}

interface ChangedCells {
  [rowIndex: number]: {
    [column: string]: boolean;
  };
}

function Table() {
  const [years, setYears] = useState<Year[]>([]);
  const [sce, setSce] = useState<Sce[]>([]);
  const [cfo, setCfo] = useState<Cfo[]>([]);

  const [acct, setAcct] = useState<Acct[]>([]);

  const [rows, setRows] = useState<Row[]>([]);
  const [editedRows, setEditedRows] = useState<EditedRows>({});
  const [changedCells, setChangedCells] = useState<ChangedCells>({});

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedSce, setSelectedSce] = useState<string>("");
  const [selectedCfo, setSelectedCfo] = useState<string>("");

  const [selectedAcct, setSelectedAcct] = useState<string>("");

  const [selectedIdSce, setSelectedIdSce] = useState<string>("");
  const [selectedIdCfo, setSelectedIdCfo] = useState<string>("");

  const [selectedIdAcct, setSelectedIdAcct] = useState<string>("");

  const [lastAddedRowIndex, setLastAddedRowIndex] = useState<number | null>(
    null
  );

  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetch("http://localhost:3000/years")
      .then((response) => response.json())
      .then((data) => setYears(data))
      .catch((error) => console.error("Error fetching years:", error));

    fetch("http://localhost:3000/sce")
      .then((response) => response.json())
      .then((data) => {
        setSce(data);
      })
      .catch((error) => console.error("Error fetching sce:", error));

    fetch("http://localhost:3000/cfo")
      .then((response) => response.json())
      .then((data) => setCfo(data))
      .catch((error) => console.error("Error fetching cfo:", error));
  }, []);

  useEffect(() => {
    if (lastAddedRowIndex !== null) {
      const timer = setTimeout(() => setLastAddedRowIndex(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedRowIndex]);

  const fetchTableData = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/data?time_year=${selectedYear}&sce_id=${selectedIdSce}&cfo_id=${selectedIdCfo}`
      );
      const data = await res.json();
      setRows(data);
      return data;
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
      throw err;
    }
  };

  const fetchAcctData = () => {
    fetch(
      `http://localhost:3000/acct?time_year=${selectedYear}&sce_id=${selectedIdSce}&cfo_id=${selectedIdCfo}`
    )
      .then((response) => response.json())
      .then((data) => setAcct(data))
      .catch((error) => console.error("Error fetching acct:", error));
  };

  const addAcctToTable = async () => {
    try {
      // 1. Отправляем запрос на добавление
      const response = await fetch("http://localhost:3000/addAcct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          time_year: selectedYear,
          sce_id: selectedIdSce,
          cfo_id: selectedIdCfo,
          acc_id: selectedIdAcct,
        }),
      });

      if (!response.ok) throw new Error("Ошибка при добавлении");
      await response.text();

      // 2. Обновляем данные (параллельно)
      const [updatedAcct, updatedRows] = await Promise.all([
        fetchAcctData(), // Обновляем список счетов
        fetchTableData(), // Обновляем таблицу
      ]);

      // 3. Сбрасываем выбранное значение
      setSelectedAcct("");
      setSelectedIdAcct("");

      // 4. Подсветка и скролл
      const newIndex = updatedRows.length - 1;
      setLastAddedRowIndex(newIndex);

      setTimeout(() => {
        const rowElement = document.querySelector(
          `tr[data-row-index="${newIndex}"]`
        );
        if (rowElement) {
          const scrollPosition =
            rowElement.getBoundingClientRect().top + window.pageYOffset - 100;
          window.scrollTo({ top: scrollPosition, behavior: "smooth" });
        }
      }, 200);

      setTimeout(() => setLastAddedRowIndex(null), 3000);
    } catch (error) {
      console.error("Ошибка добавления:", error);
    }
  };

  const handleCellChange = (
    rowIndex: number,
    column: string,
    value: string
  ) => {
    if (value === "" || /^-?\d*[,.]?\d*$/.test(value)) {
      const originalValue = rows[rowIndex][column];

      setEditedRows((prev) => ({
        ...prev,
        [rowIndex]: {
          ...prev[rowIndex],
          [column]: {
            newValue: value,
            originalValue: originalValue,
          },
        },
      }));

      setChangedCells((prev) => ({
        ...prev,
        [rowIndex]: {
          ...prev[rowIndex],
          [column]: !valuesAreEqual(value, originalValue),
        },
      }));
    }
  };

  const saveChanges = async (rowIndex: number) => {
    if (!editedRows[rowIndex]) {
      console.log("Нет изменений для сохранения");
      return;
    }

    const editedFields = Object.fromEntries(
      Object.entries(editedRows[rowIndex])
        .filter(
          ([col, data]) => !valuesAreEqual(data.newValue, data.originalValue)
        )
        .map(([col, data]) => [
          col,
          data.newValue.trim() === ""
            ? null
            : Number(data.newValue.replace(/\s/g, "").replace(/,/g, ".")),
        ])
    );

    if (Object.keys(editedFields).length === 0) {
      console.log("Нет реальных изменений для сохранения");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_id: rows[rowIndex].p_id,
          editedFields: {
            ...editedFields,
            ...Object.fromEntries(
              Object.entries(editedFields).map(([k, v]) => [
                k,
                v !== null ? String(v) : null,
              ])
            ),
          },
        }),
      });

      if (response.ok) {
        setEditedRows((prev) => {
          const newEditedRows = { ...prev };
          delete newEditedRows[rowIndex];
          return newEditedRows;
        });

        setChangedCells((prev) => {
          const newChangedCells = { ...prev };
          delete newChangedCells[rowIndex];
          return newChangedCells;
        });

        fetchTableData();

        console.log("Данные успешно сохранены");
      } else {
        console.error("Ошибка сервера:", await response.text());
      }
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
    }
  };

  const saveAllChanges = async () => {
    // Собираем все изменения из editedRows с явной типизацией
    const changesToSave = Object.entries(editedRows)
      .map(
        ([rowIndex, rowChanges]): {
          p_id: number | undefined;
          editedFields: Record<string, string | number | null>;
        } => {
          const rowId = rows[Number(rowIndex)]?.p_id;

          // Явно типизируем entries
          const changesEntries = Object.entries(rowChanges) as Array<
            [string, EditedCellValue]
          >;

          // Фильтруем и преобразуем изменения
          const editedFields = Object.fromEntries(
            changesEntries
              .filter(
                ([_, cellData]) =>
                  !valuesAreEqual(cellData.newValue, cellData.originalValue)
              )
              .map(([column, cellData]) => [
                column,
                cellData.newValue.trim() === ""
                  ? null
                  : Number(
                      cellData.newValue.replace(/\s/g, "").replace(/,/g, ".")
                    ),
              ])
          );

          return {
            p_id: rowId,
            editedFields,
          };
        }
      )
      .filter(
        (
          change
        ): change is {
          p_id: number;
          editedFields: Record<string, string | number | null>;
        } =>
          change.p_id !== undefined &&
          Object.keys(change.editedFields).length > 0
      );

    if (changesToSave.length === 0) {
      alert("Нет изменений для сохранения");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/update-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: changesToSave }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ошибка сервера");
      }

      setEditedRows({});
      setChangedCells({});

      await fetchTableData();

      alert("Все изменения успешно сохранены");
    } catch (error) {
      console.error("Ошибка сохранения:", error);
      alert(error instanceof Error ? error.message : "Ошибка при сохранении");
    }
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(event.target.value);
  };

  const handleSceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = event.target.value;
    const selectedOption = sce.find((sce) => sce.code === selectedCode);
    setSelectedSce(selectedCode);
    setSelectedIdSce(selectedOption ? selectedOption.id : "");
  };

  const handleCfoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = event.target.value;
    const selectedOption = cfo.find((cfo) => cfo.code === selectedCode);
    setSelectedCfo(selectedCode);
    setSelectedIdCfo(selectedOption ? selectedOption.id : "");
  };

  const handleAcctChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedAcct = event.target.value;
    const selectedOption = acct.find(
      (acct) => acct.description === selectedAcct
    );
    setSelectedAcct(selectedAcct);
    setSelectedIdAcct(selectedOption ? selectedOption.id : "");
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchTableData();
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/search?time_year=${selectedYear}&sce_id=${selectedIdSce}&cfo_id=${selectedIdCfo}&query=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data = await response.json();
      setRows(data);
    } catch (error) {
      console.error("Ошибка при поиске:", error);
    }
  };

  const getVisibleColumns = () => {
    if (!selectedIdSce) return [];
    const id = Number(selectedIdSce);

    if (id >= 1 && id <= 9) {
      return fixedColumns.filter((col) => col.startsWith("y0"));
    } else if (id >= 10 && id <= 12) {
      return fixedColumns;
    }
    return [];
  };

  const isEditable = (column: string) => {
    if (!selectedIdSce) return false;
    const month = parseInt(column.split("_")[1].replace("m", ""), 10);
    const selectedMonth = parseInt(selectedIdSce, 10);

    const isY1 = column.startsWith("y1_");
    const isInY0Range = month >= selectedMonth;

    if (isInY0Range && selectedMonth >= 10 && selectedMonth <= 12) {
      return true;
    }

    return isInY0Range || (isY1 && month >= 1 && month <= 12);
  };

  const formatColumnHeader = (column: string) => {
    const [yearPart, monthPart] = column.split("_");
    const isCurrentYear = yearPart === "y0";
    const year = isCurrentYear
      ? selectedYear
      : selectedYear
      ? String(Number(selectedYear) + 1)
      : "";
    const monthName =
      monthNames[monthPart as keyof typeof monthNames] || monthPart;

    return `${year ? year + " " : ""}${monthName}`;
  };

  const formatNumberValue = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "";

    const num =
      typeof value === "string"
        ? parseFloat(value.replace(/,/g, "."))
        : Number(value);

    return isNaN(num)
      ? String(value)
      : new Intl.NumberFormat("ru-RU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
  };

  const handleCellBlur = (rowIndex: number, column: string, value: string) => {
    const originalValue = rows[rowIndex][column];

    // Если поле пустое - восстанавливаем оригинальное значение
    if (value.trim() === "") {
      setEditedRows((prev) => {
        const newEditedRows = { ...prev };
        if (newEditedRows[rowIndex]) {
          delete newEditedRows[rowIndex][column];
          if (Object.keys(newEditedRows[rowIndex]).length === 0) {
            delete newEditedRows[rowIndex];
          }
        }
        return newEditedRows;
      });

      setChangedCells((prev) => {
        const newChangedCells = { ...prev };
        if (newChangedCells[rowIndex]) {
          delete newChangedCells[rowIndex][column];
          if (Object.keys(newChangedCells[rowIndex]).length === 0) {
            delete newChangedCells[rowIndex];
          }
        }
        return newChangedCells;
      });
      return;
    }

    // Проверяем, действительно ли значение изменилось
    const isValueChanged = !valuesAreEqual(value, originalValue);

    if (isValueChanged) {
      // Если значение изменилось - сохраняем новое
      const formatted = formatNumberValue(value);
      setEditedRows((prev) => ({
        ...prev,
        [rowIndex]: {
          ...prev[rowIndex],
          [column]: {
            newValue: formatted,
            originalValue: originalValue,
          },
        },
      }));

      setChangedCells((prev) => ({
        ...prev,
        [rowIndex]: {
          ...prev[rowIndex],
          [column]: true,
        },
      }));
    } else {
      // Если значение не изменилось - очищаем editedRows
      setEditedRows((prev) => {
        const newEditedRows = { ...prev };
        if (newEditedRows[rowIndex]) {
          delete newEditedRows[rowIndex][column];
          if (Object.keys(newEditedRows[rowIndex]).length === 0) {
            delete newEditedRows[rowIndex];
          }
        }
        return newEditedRows;
      });

      setChangedCells((prev) => ({
        ...prev,
        [rowIndex]: {
          ...prev[rowIndex],
          [column]: false,
        },
      }));
    }
  };

  const valuesAreEqual = (
    newValue: string,
    originalValue: string | number | null | undefined
  ): boolean => {
    if (
      newValue.trim() === "" &&
      (originalValue === null ||
        originalValue === undefined ||
        originalValue === "")
    ) {
      return true;
    }

    // Нормализация для сравнения (удаляем пробелы, заменяем запятые на точки)
    const normalize = (val: string | number) =>
      String(val).trim().replace(/\s/g, "").replace(/,/g, ".").toLowerCase();

    const normalizedNew = normalize(newValue);
    const normalizedOriginal =
      originalValue !== null && originalValue !== undefined
        ? normalize(originalValue)
        : "";

    return normalizedNew === normalizedOriginal;
  };

  const hasRowChanges = (rowIndex: number): boolean => {
    if (!editedRows[rowIndex]) return false;

    return Object.entries(editedRows[rowIndex]).some(
      ([col, data]) => !valuesAreEqual(data.newValue, data.originalValue)
    );
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        width: "98vw",
        minWidth: "1200px",
        overflowX: "hidden",
        flexDirection: "column",
        margin: "5px",
      }}
    >
      <h3 style={{ width: "97vw", marginLeft: "5px" }}>
        Редактирование/Просмотр элементов плана
      </h3>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingLeft: "30px",
          paddingRight: "40px",
          marginLeft: "10px",
          marginRight: "10px",
          alignItems: "center",
          flexDirection: "row",
          height: "80px",
          marginTop: "10px",
          marginBottom: "20px",
          backgroundColor: "white",
          borderRadius: "10px",
          boxShadow: "0px 0px 10px 5px rgb(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            height: "100%",
            marginTop: "10px",
          }}
        >
          <p
            style={{
              color: "rgb(8, 179, 2)",
              fontSize: "16px",
              fontWeight: "700",
              margin: 0,
            }}
          >
            Фильтр:
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            alignItems: "flex-end",
            height: "100%",
            marginBottom: "20px",
          }}
        >
          <p style={{ margin: 0, height: "30px", fontWeight: "bold" }}>Год</p>
          <select
            style={{ height: "30px", width: "200px", borderRadius: "5px" }}
            value={selectedYear}
            onChange={handleYearChange}
          >
            <option value="">Выберите год</option>
            {years.map((year, index) => (
              <option key={index} value={year.code_year}>
                {year.code_year}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            alignItems: "flex-end",
            height: "100%",
            marginBottom: "20px",
          }}
        >
          <p style={{ margin: 0, height: "30px", fontWeight: "bold" }}>
            Сценарий
          </p>
          <select
            style={{ height: "30px", width: "300px", borderRadius: "5px" }}
            id="sce"
            value={selectedSce}
            onChange={handleSceChange}
          >
            <option value="">Выберите sce</option>
            {sce.map((sce, index) => (
              <option key={index} value={sce.code}>
                {sce.code}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            alignItems: "flex-end",
            height: "100%",
            marginBottom: "20px",
          }}
        >
          <p style={{ margin: 0, height: "30px", fontWeight: "bold" }}>ЦФО</p>
          <select
            style={{ height: "30px", width: "300px", borderRadius: "5px" }}
            id="cfo"
            value={selectedCfo}
            onChange={handleCfoChange}
          >
            <option value="">Выберите cfo</option>
            {cfo.map((cfo, index) => (
              <option key={index} value={cfo.code}>
                {cfo.code}
              </option>
            ))}
          </select>
        </div>

        <button
          className={classes.buttonClick}
          style={{
            border: "1px solid black",
            padding: 0,
            width: "150px",
            height: "30px",
            fontFamily: "none",
            fontWeight: "bold",
            fontSize: "14px",
          }}
          onClick={() => {
            fetchTableData();
            fetchAcctData();
          }}
        >
          Загрузить данные
        </button>
      </div>

      <div
        style={{
          display: rows.length === 0 ? "none" : "flex",
          width: "100%",
          overflowX: "hidden",
          position: "relative",
          justifyContent: "center",
          marginBottom: "30px",
        }}
      >
        {/* Основная таблица с фиксированными колонками */}
        <div
          style={
            {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              margin: "20px",
              backgroundColor: "white",
              borderRadius: "10px",
              boxShadow: "0px 0px 10px 5px rgb(0, 0, 0, 0.2)",
              overflowX: "auto",
              scrollbarWidth: "none", // Скрываем скроллбар для Firefox
              msOverflowStyle: "none", // Скрываем скроллбар для IE
              "&::-webkit-scrollbar": { display: "none" }, // Скрываем скроллбар для Chrome/Safari
            } as React.CSSProperties
          }
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "white",
              height: "auto",
              width: "98%",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: "10px",
                width: "100%",
              }}
            >
              <p style={{ margin: 0 }}>Счет</p>

              <select
                style={{
                  height: "30px",
                  width: "500px",
                  borderRadius: "5px",
                  marginRight: "350px",
                }}
                id="acct"
                value={selectedAcct}
                onChange={handleAcctChange}
              >
                <option value="">Выберите счёт</option>
                {acct.map((acct, index) => (
                  <option key={index} value={acct.description}>
                    {acct.acc_code
                      ? `(${acct.acc_code}) ${acct.description}`
                      : acct.description}
                  </option>
                ))}
              </select>

              <button
                className={classes.buttonClick}
                style={{
                  backgroundColor: "blue",
                  color: "white",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  height: "33px",
                  width: "250px",
                }}
                onClick={addAcctToTable}
              >
                Добавить счет
              </button>
            </div>
            <div
              style={{
                borderBottom: "1px solid rgba(118, 118, 118, 0.48)",
                height: "1px",
                width: "100%",
              }}
            ></div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: "10px",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <input
                  placeholder="Поиск счета"
                  style={{ height: "25px", width: "250px" }}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  className={classes.buttonClick}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "30px",
                    width: "30px",
                    padding: "0px",
                    borderColor: "black",
                  }}
                  onClick={handleSearch}
                >
                  🔍
                </button>
              </div>
              <div>
                <button
                  className={classes.buttonClick}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "150px",
                    height: "30px",
                    fontSize: "13px",
                    borderColor: "black",
                  }}
                  onClick={saveAllChanges}
                  disabled={Object.keys(editedRows).length === 0}
                >
                  Сохранить все 💾
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", width: "98%" }}>
            {/* Фиксированная первая колонка (Счет) */}
            <div
              style={{
                display: rows.length === 0 ? "none" : "",
                position: "sticky",
                left: 0,
                zIndex: 2,
              }}
            >
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "300px",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "center",
                        border: "1px solid black",
                        backgroundColor: "#f9f9f9",
                        fontWeight: "bold",
                        height: "50px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      Счет
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    return (
                      <tr
                        key={rowIndex}
                        data-row-index={rowIndex}
                        style={{
                          backgroundColor:
                            rowIndex % 2 === 0 ? "white" : "#f9f9f9",
                          ...(rowIndex === lastAddedRowIndex && {
                            backgroundColor: "rgba(144, 238, 144, 0.5)",
                            transition: "background-color 0.5s ease",
                          }),
                        }}
                      >
                        <td
                          style={{
                            textAlign: "start",
                            border: "1px solid black",
                            backgroundColor: "rgba(248, 235, 117, 0.48)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "20px",
                            height: "32px",
                          }}
                          title={row.acc_desc}
                        >
                          {row.acc_desc}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Прокручиваемая центральная часть */}
            <div
              style={{
                overflowX: "auto",
                display: rows.length === 0 ? "none" : "",
              }}
            >
              <table
                style={{
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    {getVisibleColumns().map((col) => (
                      <th
                        key={col}
                        style={{
                          height: "50px",
                          minWidth: "80px",
                          border: "1px solid black",
                          backgroundColor: "#f5f5f5",
                          fontWeight: "bold",
                        }}
                      >
                        {formatColumnHeader(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      style={{
                        backgroundColor:
                          rowIndex % 2 === 0 ? "white" : "#f9f9f9",
                      }}
                    >
                      {getVisibleColumns().map((col) => {
                        const editable = isEditable(col);
                        const cellData = editedRows[rowIndex]?.[col];
                        const originalValue = row[col];
                        const displayValue = cellData
                          ? cellData.newValue
                          : formatNumberValue(originalValue ?? "");
                        const isChanged = cellData
                          ? !valuesAreEqual(
                              cellData.newValue,
                              cellData.originalValue
                            )
                          : false;
                        return (
                          <td
                            key={col}
                            className={isChanged ? classes.changedCell : ""}
                            style={{
                              textAlign: "center",
                              border: "1px solid black",
                              backgroundColor: !editable
                                ? "rgba(130, 126, 126, 0.48)"
                                : "white",
                              ...(rowIndex === lastAddedRowIndex && {
                                backgroundColor: "rgba(144, 238, 144, 0.5)",
                                transition: "background-color 0.5s ease",
                              }),
                              position: "relative", // Важно для позиционирования уголка
                            }}
                          >
                            {editable ? (
                              <input
                                style={{
                                  width: "80px",
                                  height: "30px",
                                  textAlign: "end",
                                  border: "none",
                                  ...(rowIndex === lastAddedRowIndex && {
                                    backgroundColor: "rgba(144, 238, 144, 0.5)",
                                    transition: "background-color 0.5s ease",
                                  }),
                                }}
                                type="text"
                                value={displayValue}
                                onChange={(e) =>
                                  handleCellChange(
                                    rowIndex,
                                    col,
                                    e.target.value
                                  )
                                }
                                onBlur={(e) => {
                                  handleCellBlur(rowIndex, col, e.target.value);
                                }}
                                onFocus={(e) => {
                                  const rawValue =
                                    cellData?.newValue ?? row[col];
                                  e.target.value =
                                    rawValue !== null && rawValue !== undefined
                                      ? String(rawValue)
                                          .replace(/\s/g, "")
                                          .replace(/,/g, ".")
                                      : "";
                                  e.target.select();
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "end",
                                  width: "80px",
                                  fontSize: "14px",
                                }}
                              >
                                {formatNumberValue(displayValue)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Фиксированная последняя колонка (кнопка) */}
            <div
              style={{
                display: rows.length === 0 ? "none" : "",
                position: "sticky",
                right: 0,
                zIndex: 2,
              }}
            >
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100px",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "center",
                        border: "1px solid black",
                        backgroundColor: "#f5f5f5",
                        fontWeight: "bold",
                        height: "50px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      Сохранить
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      style={{
                        backgroundColor:
                          rowIndex % 2 === 0 ? "white" : "#f9f9f9",
                        ...(rowIndex === lastAddedRowIndex && {
                          backgroundColor: "rgba(144, 238, 144, 0.5)",
                          transition: "background-color 0.5s ease",
                        }),
                      }}
                    >
                      <td
                        style={{
                          textAlign: "center",
                          border: "1px solid black",
                          width: "40px",
                          height: "32px",
                        }}
                      >
                        <button
                          style={{
                            border: "1px solid #ccc",
                            background: "white",
                            cursor: hasRowChanges(rowIndex)
                              ? "pointer"
                              : "not-allowed",
                            padding: "2px 5px",
                            borderRadius: "3px",
                            opacity: hasRowChanges(rowIndex) ? 1 : 0.5,
                          }}
                          onClick={() =>
                            hasRowChanges(rowIndex) && saveChanges(rowIndex)
                          }
                          disabled={!hasRowChanges(rowIndex)}
                        >
                          💾
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Pagination
        style={{
          marginBottom: "30px",
          display: rows.length === 0 ? "none" : "",
        }}
        align="center"
        defaultCurrent={1}
        total={50}
      />
    </div>
  );
}

export default Table;
