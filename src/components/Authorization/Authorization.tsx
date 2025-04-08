import React, { useState } from "react";

function Authorization() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("http://localhost:3000/authenticate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      console.log("Данные, отправляемые на сервер:", {
        email: formData.email,
        password: formData.password,
      });

      if (response.ok) {
        // Если аутентификация успешна, проверяем наличие сообщения от сервера
        if (data.message === "Аутентификация успешна") {
          setMessage("✅ Аутентификация успешна!");
          setIsSuccess(true);
        } else {
          setMessage(`❌ Ошибка: ${data.message || "Неверные данные"}`);
          setIsSuccess(false);
        }
      } else {
        // Если ответ не успешен, показываем сообщение об ошибке
        setMessage(`❌ Ошибка: ${data.message || "Неверные данные"}`);
        setIsSuccess(false);
      }
    } catch (error) {
      console.error("Ошибка запроса:", error);
      setMessage("❌ Ошибка сервера");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {message && (
        <div
          className={`p-2 text-center w-full rounded ${
            isSuccess
              ? "bg-green-200 text-green-800"
              : "bg-red-200 text-red-800"
          }`}
        >
          {message}
        </div>
      )}
      <h2>Авторизация</h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "gray",
          width: "300px",
          height: "250px",
          border: "2px solid black",
          borderRadius: "10px",
        }}
      >
        <form
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
          }}
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            name="email"
            style={{ width: "250px", height: "25px", borderRadius: "5px" }}
            placeholder="Логин"
            value={formData.email}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            style={{ width: "250px", height: "25px", borderRadius: "5px" }}
            placeholder="Пароль"
            value={formData.password}
            onChange={handleChange}
          />
          <button
            type="submit"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "30px",
              width: "200px",
              marginTop: "30px",
            }}
          >
            {loading ? "⏳ Подождите..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Authorization;
