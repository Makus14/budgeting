import React, { useState, useEffect } from "react";

import { Pagination } from "antd";

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

interface Row {
  p_id?: number;
  acc_desc?: string;
  [key: string]: string | number | null | undefined;
}

interface EditedRows {
  [rowIndex: number]: {
    [column: string]: string; // Только строки, без null
  };
}

function Table() {
  const [years, setYears] = useState<Year[]>([]);
  const [sce, setSce] = useState<Sce[]>([]);
  const [cfo, setCfo] = useState<Cfo[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [editedRows, setEditedRows] = useState<EditedRows>({});

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedSce, setSelectedSce] = useState<string>("");
  const [selectedCfo, setSelectedCfo] = useState<string>("");
  const [selectedIdSce, setSelectedIdSce] = useState<string>("");
  const [selectedIdCfo, setSelectedIdCfo] = useState<string>("");

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

  const fetchTableData = () => {
    fetch(
      `http://localhost:3000/data?time_year=${selectedYear}&sce_id=${selectedIdSce}&cfo_id=${selectedIdCfo}`
    )
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
      })
      .catch((err) => console.error("Ошибка загрузки данных:", err));
  };

  const handleCellChange = (
    rowIndex: number,
    column: string,
    value: string
  ) => {
    if (value === "" || /^-?\d*[,.]?\d*$/.test(value)) {
      setEditedRows((prev) => ({
        ...prev,
        [rowIndex]: {
          ...prev[rowIndex],
          [column]: value, // Сохраняем "как есть" для редактирования
        },
      }));
    }
  };

  const saveChanges = async (rowIndex: number) => {
    if (!editedRows[rowIndex]) return;

    const editedFields = Object.fromEntries(
      Object.entries(editedRows[rowIndex]).map(([key, value]) => [
        key,
        value === null || value === ""
          ? null
          : Number(value.replace(/\s/g, "").replace(/,/g, ".")),
      ])
    );

    try {
      const response = await fetch("http://localhost:3000/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_id: rows[rowIndex].p_id,
          editedFields: {
            ...editedFields,
            // Явно преобразуем все значения
            ...Object.fromEntries(
              Object.entries(editedFields).map(([k, v]) => [
                k,
                v !== null ? String(v) : null,
              ])
            ),
          },
        }),
      });
      // ... остальная логика
    } catch (error) {
      console.error("Ошибка сохранения:", error);
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

  // const parseInputValue = (value: string | null): string | null => {
  //   if (value === null || value === "") return null;
  //   return value.replace(/\s/g, "").replace(/,/g, ".");
  // };

  // const handleCellBlur = (rowIndex: number, column: string, value: string) => {
  //   const formatted = formatNumberValue(value);
  //   setEditedRows((prev) => ({
  //     ...prev,
  //     [rowIndex]: {
  //       ...prev[rowIndex],
  //       [column]: formatted, // Сохраняем уже отформатированное значение
  //     },
  //   }));
  // };

  const handleCellBlur = (rowIndex: number, column: string, value: string) => {
    // Если поле пустое — восстанавливаем значение из исходных данных (rows)
    if (value.trim() === "") {
      setEditedRows((prev) => {
        const newEditedRows = { ...prev };
        // Удаляем запись, чтобы вернуться к исходному значению из `rows`
        if (newEditedRows[rowIndex]) {
          delete newEditedRows[rowIndex][column];
          // Если строка стала пустой, удаляем её полностью
          if (Object.keys(newEditedRows[rowIndex]).length === 0) {
            delete newEditedRows[rowIndex];
          }
        }
        return newEditedRows;
      });
      return; // Выходим, чтобы не сохранять пустое значение
    }

    // Если значение не пустое — форматируем и сохраняем
    const formatted = formatNumberValue(value);
    setEditedRows((prev) => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        [column]: formatted,
      },
    }));
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
          // border: "1px solid black",
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
          style={{
            border: "1px solid black",
            padding: 0,
            width: "150px",
            height: "30px",
            fontFamily: "none",
            fontWeight: "bold",
            fontSize: "14px",
          }}
          onClick={fetchTableData}
        >
          Загрузить данные
        </button>
      </div>

      <div
        style={{
          display: "flex",
          width: "100%",
          overflowX: "hidden",
          position: "relative",
          justifyContent: "center",
          marginBottom: "30px",
          // border: "1px solid black",
        }}
      >
        {/* Основная таблица с фиксированными колонками */}
        <div
          style={
            {
              display: "flex",
              // width: "100%",
              margin: "20px",
              overflowX: "auto", // Разрешаем скролл для всей таблицы
              scrollbarWidth: "none", // Скрываем скроллбар для Firefox
              msOverflowStyle: "none", // Скрываем скроллбар для IE
              "&::-webkit-scrollbar": { display: "none" }, // Скрываем скроллбар для Chrome/Safari
            } as React.CSSProperties
          }
        >
          {/* Фиксированная первая колонка (Счет) */}
          <div
            style={{
              display: rows.length === 0 ? "none" : "",
              position: "sticky",
              left: 0,
              zIndex: 2,
              backgroundColor: "#e3eff4",
            }}
          >
            <table
              style={{
                borderCollapse: "collapse",
                height: "542px",
                width: "300px",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      // Уменьшенный padding
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
                {rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    style={{
                      backgroundColor: rowIndex % 2 === 0 ? "white" : "#f9f9f9",
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
                      }}
                      title={row.acc_desc}
                    >
                      {row.acc_desc}
                    </td>
                  </tr>
                ))}
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
                      backgroundColor: rowIndex % 2 === 0 ? "white" : "#f9f9f9",
                    }}
                  >
                    {getVisibleColumns().map((col) => {
                      const editable = isEditable(col);
                      const value =
                        editedRows[rowIndex]?.[col] ?? row[col] ?? "";

                      return (
                        <td
                          key={col}
                          style={{
                            textAlign: "center",
                            padding: "8px",
                            border: "1px solid black",
                            backgroundColor: !editable
                              ? "rgba(130, 126, 126, 0.48)"
                              : "white",
                          }}
                        >
                          {editable ? (
                            <input
                              style={{
                                width: "80px",
                                height: "30px",
                                textAlign: "end",
                                border: "none",
                              }}
                              type="text"
                              value={
                                editedRows[rowIndex]?.[col] !== undefined
                                  ? editedRows[rowIndex][col]
                                  : formatNumberValue(row[col])
                              }
                              onChange={(e) =>
                                handleCellChange(rowIndex, col, e.target.value)
                              }
                              onBlur={(e) => {
                                if (e.target.value.trim() === "") {
                                  const prevValue = row[col];
                                  // Преобразуем значение к строке и проверяем на null/undefined
                                  const stringValue =
                                    prevValue !== null &&
                                    prevValue !== undefined
                                      ? String(prevValue)
                                      : ""; // или другое значение по умолчанию

                                  setEditedRows((prev) => ({
                                    ...prev,
                                    [rowIndex]: {
                                      ...prev[rowIndex],
                                      [col]: stringValue, // Теперь точно строка
                                    },
                                  }));
                                } else {
                                  handleCellBlur(rowIndex, col, e.target.value);
                                }
                              }}
                              onFocus={(e) => {
                                // При фокусе показываем "сырое" число без форматирования
                                const rawValue =
                                  editedRows[rowIndex]?.[col] ?? row[col];
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
                              {formatNumberValue(value)}
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
              backgroundColor: "#e3eff4",
            }}
          >
            <table
              style={{
                borderCollapse: "collapse",
                height: "542px",
                width: "100px",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      // padding: "8px",
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
                      backgroundColor: rowIndex % 2 === 0 ? "white" : "#f9f9f9",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        border: "1px solid black",
                        width: "40px",
                      }}
                    >
                      <button
                        style={{
                          border: "1px solid #ccc",
                          background: "white",
                          cursor: "pointer",
                          padding: "2px 5px",
                          borderRadius: "3px",
                        }}
                        onClick={() => saveChanges(rowIndex)}
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
