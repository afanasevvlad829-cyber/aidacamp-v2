// Tkinter & Pygame Academy — образовательная платформа
const TOPICS = [
  {id:1, emoji:"🪟", title:"Знакомство с Tkinter", level:"easy", group:"Tkinter",
    intro:"Tkinter — это волшебная коробочка, которая помогает делать настоящие окошки на твоём компьютере! 🪟 До этого все программы говорили только текстом в консоли, а теперь у тебя будут окна с кнопками, картинками и полями ввода — как у настоящих программ! Tkinter уже встроен в Python — ничего скачивать не надо. 🎨 Пример из жизни: представь, что Python — это художник, а Tkinter — это его краски и кисточки. С их помощью художник рисует окошки на твоём экране! Каждое окно начинается с команды Tk(), а заканчивается mainloop() — это «включи окно и слушай, что делает пользователь».",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nroot.title(\"Моё первое окно\")\nroot.geometry(\"300x200\")\nroot.mainloop()",
    syntaxNote:"Tk() — создаёт окно. title — надпись сверху. geometry('ШИРИНАxВЫСОТА') — размер окна. mainloop() — ОБЯЗАТЕЛЬНО в конце, иначе окно мгновенно закроется!"},
  {id:2, emoji:"🏷️", title:"Метки (Label)", level:"easy", group:"Tkinter",
    intro:"Метка (Label) — это просто текст или картинка внутри окна! 🏷️ Это как наклеечка, которую ты приклеил на холодильник: на ней что-то написано. Метками делают заголовки, подписи к полям, инструкции — всё, где нужно показать текст, а не вводить его. 📝 Пример из жизни: в магазине под каждой пачкой печенья висит ценник — это и есть Label. В программах метки показывают приветствие, имя пользователя, счёт в игре или подсказку «Введите пароль». Можно менять шрифт, цвет, фон и даже выравнивание.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nlabel = tk.Label(root, text=\"Привет, мир!\", font=(\"Arial\", 20), fg=\"blue\")\nlabel.pack(padx=20, pady=20)\nroot.mainloop()",
    syntaxNote:"text — что написано. font=(шрифт, размер). fg — цвет текста. bg — цвет фона. pack() — добавляет виджет в окно."},
  {id:3, emoji:"🔘", title:"Кнопки (Button)", level:"easy", group:"Tkinter",
    intro:"Кнопка — это первый шаг к настоящему взаимодействию! 🔘 Пользователь нажимает на неё — и что-то происходит! Это уже не просто красивое окно, а живая программа, которая отвечает на действия. В Tkinter ты создаёшь кнопку и говоришь ей: «Когда тебя нажмут, вызови вот эту функцию». 🎮 Пример из жизни: кнопка на лифте, на пульте от телевизора, иконка приложения — это всё кнопки. В программах одна кнопка может посчитать сумму, другая — открыть файл, третья — выйти из программы.",
    syntax:"import tkinter as tk\n\ndef hello():\n    print(\"Кнопка нажата!\")\n\nroot = tk.Tk()\nbtn = tk.Button(root, text=\"Нажми меня\", command=hello)\nbtn.pack(padx=20, pady=20)\nroot.mainloop()",
    syntaxNote:"command=функция — ВАЖНО: без скобок! Если напишешь command=hello() — функция вызовется сразу один раз, а не при нажатии."},
  {id:4, emoji:"⌨️", title:"Поля ввода (Entry)", level:"easy", group:"Tkinter",
    intro:"Entry — это поле, куда пользователь может вписать текст! ⌨️ Имя, пароль, число, ответ в викторине — всё это вводится через Entry. Программа потом читает то, что написали, и использует. 📋 Пример из жизни: форма регистрации, поле поиска в Google, окошко для ввода кода в банкомате — это всё Entry. Чтобы получить введённый текст, используй метод .get(). Чтобы стереть всё — .delete(0, tk.END). Чтобы спрятать пароль звёздочками — show='*'.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nentry = tk.Entry(root, font=(\"Arial\", 14))\nentry.pack(padx=20, pady=20)\n\ndef show():\n    print(\"Ты ввёл:\", entry.get())\n\ntk.Button(root, text=\"OK\", command=show).pack()\nroot.mainloop()",
    syntaxNote:"entry.get() возвращает строку. Чтобы превратить в число — int(entry.get()). show='*' прячет символы (для паролей)."},
  {id:5, emoji:"📜", title:"Многострочный текст (Text)", level:"easy", group:"Tkinter",
    intro:"Виджет Text — это большое поле, куда можно вводить и редактировать много строк! 📜 Entry умеет только одну строку, а Text — целое сочинение. Это как блокнот внутри твоей программы! ✏️ Пример из жизни: окно чата, редактор сочинений, заметки — везде где нужен длинный текст. Можно менять цвета отдельных слов, вставлять и удалять текст программно, прокручивать. Метод insert добавляет, get забирает, delete стирает.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\ntxt = tk.Text(root, width=40, height=10)\ntxt.pack(padx=10, pady=10)\ntxt.insert(\"1.0\", \"Это многострочное поле!\\nМожно писать книги!\")\nroot.mainloop()",
    syntaxNote:"\"1.0\" значит «строка 1, символ 0» — самое начало. tk.END — самый конец. txt.get(\"1.0\", tk.END) возвращает весь текст."},
  {id:6, emoji:"🎨", title:"Цвета и шрифты", level:"easy", group:"Tkinter",
    intro:"Дизайн делает программу красивой и удобной! 🎨 У каждого виджета можно поменять цвет фона (bg), цвет текста (fg), шрифт и размер. Цвета задают именами ('red', 'blue') или HEX-кодами ('#ff6600'). 🖌️ Пример из жизни: яркая кнопка «Купить» в магазине, синие ссылки на сайтах, тёмная тема в приложениях — это всё игра с цветами и шрифтами. Хорошо выбранные цвета делают программу профессиональной, а большой шрифт — читаемой даже для бабушки!",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nroot.configure(bg=\"#222\")\ntk.Label(root, text=\"Стиль!\", bg=\"#222\", fg=\"#ffcc00\",\n         font=(\"Comic Sans MS\", 24, \"bold\")).pack(padx=30, pady=30)\nroot.mainloop()",
    syntaxNote:"font=(семья, размер, 'bold' / 'italic' / 'underline'). HEX-цвет начинается с # и содержит 6 шестнадцатеричных цифр."},
  {id:7, emoji:"📦", title:"Размещение pack", level:"easy", group:"Tkinter",
    intro:"pack() — самый простой способ расставить виджеты! 📦 Он складывает их сверху вниз (как стопку блинов) или слева направо (как вагоны поезда). Параметр side управляет направлением: 'top' (по умолчанию), 'bottom', 'left', 'right'. 🚂 Пример из жизни: чтобы расставить книги на полке, ты можешь складывать их одну на другую (стопкой) или ставить рядом (в ряд). Pack делает то же самое! Параметры padx/pady добавляют отступы, fill растягивает виджет.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\ntk.Label(root, text=\"Сверху\", bg=\"red\").pack(side=\"top\", fill=\"x\")\ntk.Label(root, text=\"Снизу\", bg=\"green\").pack(side=\"bottom\", fill=\"x\")\ntk.Label(root, text=\"Слева\", bg=\"yellow\").pack(side=\"left\", fill=\"y\")\ntk.Label(root, text=\"Справа\", bg=\"cyan\").pack(side=\"right\", fill=\"y\")\nroot.mainloop()",
    syntaxNote:"fill='x' растягивает по ширине, 'y' по высоте, 'both' — во все стороны. expand=True заставляет занять всё свободное место."},
  {id:8, emoji:"🔲", title:"Размещение grid", level:"mid", group:"Tkinter",
    intro:"grid() — это как клетчатая тетрадь! 🔲 Окно делится на строки и колонки, и ты говоришь: «эта кнопка в строке 2, колонке 1». Очень удобно для форм, калькуляторов, таблиц — всего, где нужна аккуратная сетка. 📐 Пример из жизни: клавиатура — это сетка из кнопок! Excel — это таблица из ячеек. С grid очень легко делать такие штуки. ВАЖНО: не смешивай pack и grid в одном окне — Tkinter запутается!",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nfor r in range(3):\n    for c in range(3):\n        tk.Button(root, text=f\"{r},{c}\", width=6).grid(row=r, column=c, padx=2, pady=2)\nroot.mainloop()",
    syntaxNote:"row — строка (0,1,2...), column — колонка. columnspan/rowspan — растянуть на несколько клеток. sticky='nsew' прижимает к краям клетки."},
  {id:9, emoji:"📍", title:"Размещение place", level:"mid", group:"Tkinter",
    intro:"place() — это «точные координаты»! 📍 Ты сам говоришь: x=50, y=100 — и виджет встаёт ровно туда, в пиксель. Так делают игры, заставки, нестандартный дизайн. 🎯 Пример из жизни: рисуешь карту сокровищ и отмечаешь крестик в конкретной точке. Place отлично подходит для абсолютного позиционирования, но если окно растянуть — виджеты не подстроятся. Можно использовать relx/rely (от 0 до 1) — это «доля от размера окна», тогда всё будет подстраиваться.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nroot.geometry(\"300x200\")\ntk.Label(root, text=\"Я в (50,30)\", bg=\"pink\").place(x=50, y=30)\ntk.Label(root, text=\"В центре\", bg=\"lightblue\").place(relx=0.5, rely=0.5, anchor=\"center\")\nroot.mainloop()",
    syntaxNote:"relx=0.5, rely=0.5, anchor='center' = строго по центру окна. anchor: 'n','s','e','w','ne','nw','se','sw','center'."},
  {id:10, emoji:"🗂️", title:"Фреймы (Frame)", level:"mid", group:"Tkinter",
    intro:"Frame — это окно внутри окна! 🗂️ Это пустая рамка, куда ты складываешь группу виджетов. Зачем? Чтобы организовать сложный интерфейс: например, слева — список друзей, справа — чат. Каждая часть живёт в своём фрейме. 🏗️ Пример из жизни: квартира поделена на комнаты. Frame — это комната, виджеты — это мебель. Так гораздо легче управлять большим окном! Внутри одного Frame можно использовать pack, внутри другого — grid. Это легально!",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nleft = tk.Frame(root, bg=\"lightblue\", width=100, height=200)\nleft.pack(side=\"left\", fill=\"y\")\nright = tk.Frame(root, bg=\"lightyellow\", width=200, height=200)\nright.pack(side=\"right\", fill=\"both\", expand=True)\ntk.Label(left, text=\"Меню\", bg=\"lightblue\").pack(pady=10)\ntk.Label(right, text=\"Содержимое\", bg=\"lightyellow\").pack(pady=10)\nroot.mainloop()",
    syntaxNote:"Фреймы не видны без bg или border. Внутри Frame используй любой менеджер размещения. Это контейнер, как div в HTML."},
  {id:11, emoji:"☑️", title:"Чекбоксы и радиокнопки", level:"mid", group:"Tkinter",
    intro:"Checkbutton — это галочка: можно поставить несколько! ☑️ Radiobutton — это кружок: только один из группы. Используют их для опций и выбора. 🍕 Пример из жизни: при заказе пиццы ты выбираешь СКОЛЬКО УГОДНО начинок (грибы ☑ сыр ☑ ветчина ☑) — это чекбоксы. А размер пиццы (маленькая ◯ средняя ◉ большая ◯) — только ОДИН вариант, это радиокнопки. Для них нужна переменная Tkinter: IntVar или StringVar — она хранит текущее значение.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nvar = tk.IntVar(value=1)\ntk.Radiobutton(root, text=\"Маленькая\", variable=var, value=1).pack(anchor=\"w\")\ntk.Radiobutton(root, text=\"Большая\", variable=var, value=2).pack(anchor=\"w\")\n\ncheese = tk.IntVar()\ntk.Checkbutton(root, text=\"Сыр\", variable=cheese).pack(anchor=\"w\")\ntk.Button(root, text=\"OK\", command=lambda: print(var.get(), cheese.get())).pack()\nroot.mainloop()",
    syntaxNote:"IntVar()/StringVar() — переменные Tkinter. .get() читает, .set(x) устанавливает. variable= связывает с виджетом."},
  {id:12, emoji:"📋", title:"Списки (Listbox)", level:"mid", group:"Tkinter",
    intro:"Listbox — это список, из которого можно выбрать пункт! 📋 Удобно показывать друзей, песни, файлы, задачи — что угодно перечислимое. Пользователь кликает по строке — программа узнаёт, какой пункт выбран. 🎵 Пример из жизни: список треков в плеере, список контактов в телефоне, файлы в проводнике. Методы: insert(индекс, текст) — добавить, delete(индекс) — удалить, curselection() — какой пункт выбран сейчас, get(индекс) — текст пункта.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nlb = tk.Listbox(root, font=(\"Arial\", 14), height=5)\nfor item in [\"Молоко\", \"Хлеб\", \"Яблоки\", \"Сыр\"]:\n    lb.insert(tk.END, item)\nlb.pack(padx=10, pady=10)\n\ndef show():\n    print(\"Выбрано:\", lb.get(lb.curselection()))\n\ntk.Button(root, text=\"Что выбрано?\", command=show).pack()\nroot.mainloop()",
    syntaxNote:"tk.END — добавить в конец списка. curselection() возвращает кортеж индексов выбранных строк. Чтобы выбирать несколько — selectmode='multiple'."},
  {id:13, emoji:"🍔", title:"Меню (Menu)", level:"mid", group:"Tkinter",
    intro:"Меню — это полоска сверху окна с пунктами «Файл», «Правка», «Помощь»! 🍔 Когда программа становится большой, кнопки уже не помещаются — тогда команды прячут в меню. Это профессиональный вид настоящего приложения! 🗂️ Пример из жизни: в Word есть меню «Файл» с пунктами «Открыть», «Сохранить», «Печать» — точно так же ты сделаешь в своей программе. У каждой команды меню — своя функция, которая выполнится при клике.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nmenu = tk.Menu(root)\nfile_menu = tk.Menu(menu, tearoff=0)\nfile_menu.add_command(label=\"Новый\", command=lambda: print(\"Новый\"))\nfile_menu.add_command(label=\"Выход\", command=root.quit)\nmenu.add_cascade(label=\"Файл\", menu=file_menu)\nroot.config(menu=menu)\nroot.mainloop()",
    syntaxNote:"tearoff=0 убирает 'отрывную' линию вверху. add_cascade добавляет подменю. add_separator — горизонтальная линия между пунктами."},
  {id:14, emoji:"💬", title:"Диалоговые окна", level:"mid", group:"Tkinter",
    intro:"Диалоги — это всплывающие окошки: сообщение, вопрос, выбор файла! 💬 Модуль messagebox показывает «Ошибка!», «Сохранить?», «Готово!». Модуль filedialog позволяет выбрать файл с диска. ⚠️ Пример из жизни: окошко «Вы уверены, что хотите удалить?» — это messagebox.askyesno. «Сохранить как» в Word — это filedialog. Они блокируют окно: пока не ответишь — дальше не пойдёт.",
    syntax:"import tkinter as tk\nfrom tkinter import messagebox\n\nroot = tk.Tk()\n\ndef ask():\n    if messagebox.askyesno(\"Вопрос\", \"Хочешь печеньку?\"):\n        messagebox.showinfo(\"Ура\", \"Держи! 🍪\")\n    else:\n        messagebox.showwarning(\"Жаль\", \"Ну ладно...\")\n\ntk.Button(root, text=\"Спросить\", command=ask).pack(padx=20, pady=20)\nroot.mainloop()",
    syntaxNote:"showinfo, showwarning, showerror — просто показать. askyesno возвращает True/False. askokcancel, askquestion — другие варианты."},
  {id:15, emoji:"🖼️", title:"Холст (Canvas)", level:"mid", group:"Tkinter",
    intro:"Canvas — это твой холст для рисования прямо в окне! 🖼️ Можно рисовать линии, прямоугольники, круги, текст и даже картинки. Это первый шаг к собственной графической программе или мини-игре! 🎨 Пример из жизни: Paint, графический редактор, рисовалка для детей. С Canvas ты сделаешь свой Paint за 30 строк! Каждая фигура получает уникальный ID — её можно потом подвинуть, перекрасить или удалить.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nc = tk.Canvas(root, width=300, height=200, bg=\"white\")\nc.pack()\nc.create_rectangle(20, 20, 120, 100, fill=\"red\")\nc.create_oval(150, 30, 250, 130, fill=\"blue\")\nc.create_line(0, 180, 300, 180, width=3)\nc.create_text(150, 190, text=\"Привет!\", font=(\"Arial\", 14))\nroot.mainloop()",
    syntaxNote:"Координаты считаются от левого верхнего угла (0,0). create_oval(x1,y1,x2,y2) рисует овал в прямоугольнике. fill — заливка, outline — обводка."},
  {id:16, emoji:"🎬", title:"Анимация на Canvas", level:"hard", group:"Tkinter",
    intro:"Анимация — это когда фигуры двигаются сами! 🎬 Секрет прост: каждые несколько миллисекунд мы чуть-чуть сдвигаем фигуру с помощью c.move(id, dx, dy). Тkinter повторяет это через root.after(время, функция). Глазу кажется, что фигура едет! 🏎️ Пример из жизни: мультики — это тоже много картинок подряд. Когда они меняются быстро, мы видим движение. Так же и здесь: 30 раз в секунду двигай мячик — получишь живую игру.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nc = tk.Canvas(root, width=400, height=200, bg=\"white\")\nc.pack()\nball = c.create_oval(10, 80, 50, 120, fill=\"orange\")\n\ndef move():\n    c.move(ball, 2, 0)\n    root.after(20, move)\n\nmove()\nroot.mainloop()",
    syntaxNote:"root.after(мс, функция) запускает функцию через N миллисекунд. Чтобы двигать постоянно — функция вызывает after сама себя в конце."},
  {id:17, emoji:"🖱️", title:"События мыши и клавиатуры", level:"hard", group:"Tkinter",
    intro:"События — это реакция программы на действия пользователя! 🖱️ Клик мыши, движение, нажатие клавиши — всё это события. С помощью .bind() ты говоришь виджету: «когда случится X — вызови функцию Y». ⌨️ Пример из жизни: в игре стрелочка движется когда жмёшь стрелки на клавиатуре — это события. Меню открывается по правому клику — тоже событие. Функция получает объект event с координатами (event.x, event.y) или нажатой клавишей (event.keysym).",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nc = tk.Canvas(root, width=400, height=300, bg=\"white\")\nc.pack()\n\ndef click(e):\n    c.create_oval(e.x-10, e.y-10, e.x+10, e.y+10, fill=\"red\")\n\nc.bind(\"<Button-1>\", click)\nroot.bind(\"<Escape>\", lambda e: root.quit())\nroot.mainloop()",
    syntaxNote:"<Button-1> — левая кнопка мыши, <Button-3> — правая. <Key>, <KeyPress-a>, <Return>, <Escape>, <Motion> — другие события."},
  {id:18, emoji:"⏱️", title:"Таймеры (after)", level:"mid", group:"Tkinter",
    intro:"root.after(мс, функция) — это таймер Tkinter! ⏱️ Он запускает функцию через указанное время, не блокируя окно. Никогда не используй time.sleep() в Tkinter — окно зависнет! 🕒 Пример из жизни: секундомер, обратный отсчёт, авто-сохранение каждые 5 минут, мерцающая надпись. Всё это таймеры. Если функция в конце снова вызывает after — получится цикл, который сам себя повторяет.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nlbl = tk.Label(root, text=\"10\", font=(\"Arial\", 48))\nlbl.pack(padx=40, pady=40)\n\nn = 10\ndef tick():\n    global n\n    lbl.config(text=str(n))\n    if n > 0:\n        n -= 1\n        root.after(1000, tick)\n\ntick()\nroot.mainloop()",
    syntaxNote:"1000 мс = 1 секунда. after_cancel(id) отменяет запланированный вызов. Используй для часов, анимаций, таймеров."},
  {id:19, emoji:"🖼️", title:"Изображения в Tkinter", level:"hard", group:"Tkinter",
    intro:"Изображения делают программу красивой! 🖼️ Tkinter из коробки умеет PNG и GIF через PhotoImage. Картинку можно поставить на Label, Button или Canvas. ⚠️ Важно: переменную с картинкой нельзя терять — иначе она «исчезнет» из-за сборщика мусора. Поэтому её часто делают атрибутом объекта или глобальной. 🎨 Пример из жизни: иконки в твоей программе, аватарка пользователя, фото товара — всё это PhotoImage. Для JPG нужна библиотека Pillow.",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\n# Замени \"cat.png\" на путь к своей картинке\nimg = tk.PhotoImage(file=\"cat.png\")\ntk.Label(root, image=img).pack()\ntk.Button(root, text=\"Кнопка с картинкой\", image=img, compound=\"left\").pack()\nroot.mainloop()",
    syntaxNote:"PhotoImage поддерживает только PNG и GIF. Для JPG: from PIL import Image, ImageTk; ImageTk.PhotoImage(Image.open('file.jpg'))."},
  {id:20, emoji:"🚀", title:"Мини-проекты Tkinter", level:"hard", group:"Tkinter",
    intro:"Время собрать всё вместе! 🚀 Мини-проект — это настоящая маленькая программа, которой кто-то может пользоваться. Калькулятор, рисовалка, To-Do, конвертер, мини-блокнот, игра «Камень-ножницы-бумага» — всё это делается за час с помощью того, что ты уже знаешь! 🌟 Совет: начни с простой версии. Сначала окно. Потом одна кнопка. Потом ещё. Потом подключи логику. Не пытайся сразу сделать идеально — наращивай постепенно. Каждый большой проект так и начинается!",
    syntax:"import tkinter as tk\n\nroot = tk.Tk()\nroot.title(\"Калькулятор\")\ne = tk.Entry(root, font=(\"Arial\", 18), justify=\"right\")\ne.grid(row=0, column=0, columnspan=4, sticky=\"we\")\n\ndef press(x):\n    e.insert(tk.END, x)\n\ndef calc():\n    try: e.delete(0, tk.END); e.insert(0, eval(e.get()))\n    except: e.insert(0, \"Ошибка\")\n\nkeys = \"789+456-123*0.=/\"\nfor i, k in enumerate(keys):\n    cmd = calc if k == \"=\" else (lambda x=k: press(x))\n    tk.Button(root, text=k, width=4, command=cmd).grid(row=1+i//4, column=i%4)\nroot.mainloop()",
    syntaxNote:"Главный принцип: маленькие части, каждая отвечает за одно. Тестируй после каждой кнопки. eval() — простой способ посчитать выражение."},
  {id:21, emoji:"🎮", title:"Знакомство с Pygame", level:"easy", group:"Pygame",
    intro:"Pygame — это библиотека для настоящих игр на Python! 🎮 С её помощью сделали тысячи 2D-игр: платформеры, аркады, головоломки. В отличие от Tkinter, Pygame заточен именно под игры: быстрое рисование, спрайты, столкновения, звуки. ⚙️ Установка: открой терминал и напиши: pip install pygame. После этого можно создавать своё игровое окно! Всегда начинаем с pygame.init() и заканчиваем pygame.quit().",
    syntax:"import pygame\n\npygame.init()\nscreen = pygame.display.set_mode((600, 400))\npygame.display.set_caption(\"Моя первая игра!\")\nrunning = True\nwhile running:\n    for event in pygame.event.get():\n        if event.type == pygame.QUIT:\n            running = False\npygame.quit()",
    syntaxNote:"set_mode((ширина, высота)) — создаёт окно игры. pygame.QUIT — событие закрытия окна. Без обработки QUIT окно не закроется по кнопке X."},
  {id:22, emoji:"🎨", title:"Цвета и фигуры", level:"easy", group:"Pygame",
    intro:"В Pygame ты рисуешь фигуры прямо на экране! 🎨 Прямоугольники, круги, линии, многоугольники — все эти примитивы доступны через pygame.draw. Цвета задают тройкой чисел RGB: (255,0,0) — красный, (0,255,0) — зелёный, (0,0,255) — синий. 🌈 Пример из жизни: твой первый рисунок — солнце, дом, дерево. С Pygame ты сделаешь это в коде! Не забудь pygame.display.flip() в конце — это «показать всё нарисованное на экране».",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nscreen.fill((30, 30, 60))\npygame.draw.rect(screen, (255, 100, 0), (50, 50, 100, 80))\npygame.draw.circle(screen, (255, 255, 0), (300, 100), 40)\npygame.draw.line(screen, (255, 255, 255), (0, 250), (400, 250), 3)\npygame.display.flip()\nimport time; time.sleep(2)\npygame.quit()",
    syntaxNote:"draw.rect(поверхность, цвет, (x, y, ширина, высота)). draw.circle(поверхность, цвет, (x, y), радиус). flip() обновляет экран."},
  {id:23, emoji:"🖼️", title:"Изображения и спрайты", level:"easy", group:"Pygame",
    intro:"Спрайт — это картинка персонажа или объекта в игре! 🖼️ Pygame загружает PNG, JPG и BMP через pygame.image.load(). Чтобы нарисовать её — screen.blit(картинка, (x, y)). Так оживают герои, монстры, фоны. 🦸 Пример из жизни: Mario, Sonic, Angry Birds — все эти герои — спрайты. Размер картинки можно поменять через pygame.transform.scale. Прозрачные участки PNG будут прозрачными в игре. Чтобы повернуть — pygame.transform.rotate.",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\n# Замени \"hero.png\" на путь к своей картинке\nhero = pygame.image.load(\"hero.png\")\nhero = pygame.transform.scale(hero, (64, 64))\nscreen.fill((150, 200, 255))\nscreen.blit(hero, (100, 100))\npygame.display.flip()\nimport time; time.sleep(2)\npygame.quit()",
    syntaxNote:"blit(картинка, позиция) — нарисовать. convert_alpha() ускоряет рисование PNG с прозрачностью: pygame.image.load(...).convert_alpha()."},
  {id:24, emoji:"🔁", title:"Главный игровой цикл", level:"easy", group:"Pygame",
    intro:"Главный цикл — сердце игры! 🔁 Он повторяется 60 раз в секунду и делает три вещи: ① обрабатывает события (нажатия клавиш, клики), ② обновляет состояние (двигает героев), ③ перерисовывает экран. Без цикла игры не существует! 🎬 Пример из жизни: кинолента — это 24 кадра в секунду. Игра — 60 кадров. Каждый раз цикл рисует новый кадр. Объект pygame.time.Clock() помогает поддерживать стабильную скорость через clock.tick(60).",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nclock = pygame.time.Clock()\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT:\n            running = False\n    screen.fill((50, 50, 80))\n    pygame.draw.circle(screen, (255, 200, 0), (200, 150), 40)\n    pygame.display.flip()\n    clock.tick(60)\npygame.quit()",
    syntaxNote:"clock.tick(60) — максимум 60 FPS. Без него игра побежит как сумасшедшая. Каждый кадр: события → логика → рисование → flip."},
  {id:25, emoji:"🏃", title:"Движение объектов", level:"easy", group:"Pygame",
    intro:"Движение — это просто меняющиеся координаты! 🏃 Если каждый кадр прибавлять к x немного — фигура поедет вправо. Эту прибавку называют «скорость». Хочешь чтобы шар отскакивал от стен? Когда долетит до края — поменяй знак скорости! ⚽ Пример из жизни: мячик в Pong, машинка в гонке, пуля в шутере — везде одна логика: координаты + скорость = движение. Скорость можно менять и для красивых эффектов (ускорение, гравитация).",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nclock = pygame.time.Clock()\nx, y, vx, vy = 50, 50, 4, 3\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    x += vx; y += vy\n    if x < 0 or x > 380: vx = -vx\n    if y < 0 or y > 280: vy = -vy\n    screen.fill((20, 20, 40))\n    pygame.draw.rect(screen, (0, 255, 100), (x, y, 20, 20))\n    pygame.display.flip()\n    clock.tick(60)\npygame.quit()",
    syntaxNote:"vx и vy — компоненты скорости. Чтобы отскакивать от стен — меняй знак при достижении края. Гравитация: vy += 0.3 каждый кадр."},
  {id:26, emoji:"⌨️", title:"Управление клавиатурой", level:"easy", group:"Pygame",
    intro:"Игроком надо управлять! ⌨️ Pygame даёт два способа: ① события pygame.KEYDOWN (один раз при нажатии), ② pygame.key.get_pressed() (текущее состояние всех клавиш — идеально для плавного движения). 🕹️ Пример из жизни: ходьба персонажа — пока держишь стрелку, он идёт. Это get_pressed(). Прыжок по пробелу — один раз нажал, один раз прыгнул. Это KEYDOWN. Клавиши: pygame.K_LEFT, K_RIGHT, K_UP, K_DOWN, K_SPACE, K_a, K_w, K_s, K_d.",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nclock = pygame.time.Clock()\nx, y = 200, 150\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    keys = pygame.key.get_pressed()\n    if keys[pygame.K_LEFT]: x -= 4\n    if keys[pygame.K_RIGHT]: x += 4\n    if keys[pygame.K_UP]: y -= 4\n    if keys[pygame.K_DOWN]: y += 4\n    screen.fill((10, 10, 30))\n    pygame.draw.circle(screen, (100, 200, 255), (x, y), 20)\n    pygame.display.flip()\n    clock.tick(60)\npygame.quit()",
    syntaxNote:"get_pressed() лучше для непрерывного движения. KEYDOWN — для разовых действий (выстрел, прыжок, переключение оружия)."},
  {id:27, emoji:"🖱️", title:"Управление мышью", level:"mid", group:"Pygame",
    intro:"Мышка — отличный способ управлять! 🖱️ Можно ловить клики (MOUSEBUTTONDOWN), движение (MOUSEMOTION) или просто узнать текущую позицию (pygame.mouse.get_pos()). 🎯 Пример из жизни: тир — клик стреляет в точку курсора. Стратегия — клик выбирает юнита. Платформер — мышка целится для прыжка. Кнопки делают по принципу: «если клик попал в прямоугольник кнопки — вызови функцию». Это база всех меню!",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nclock = pygame.time.Clock()\ndots = []\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        if e.type == pygame.MOUSEBUTTONDOWN:\n            dots.append(e.pos)\n    screen.fill((255, 255, 255))\n    for d in dots:\n        pygame.draw.circle(screen, (200, 0, 0), d, 8)\n    pygame.display.flip()\n    clock.tick(60)\npygame.quit()",
    syntaxNote:"event.pos = (x, y) координаты клика. event.button: 1 левая, 2 средняя, 3 правая. pygame.mouse.get_pos() — позиция курсора."},
  {id:28, emoji:"🔤", title:"Текст и шрифты", level:"mid", group:"Pygame",
    intro:"Очки, надписи, диалоги — всё это текст! 🔤 В Pygame текст рисуется в два шага: ① создаём шрифт pygame.font.Font или SysFont, ② рендерим текст в картинку через render и рисуем её через blit. 🏆 Пример из жизни: счёт в игре, имя игрока, заставка «GAME OVER», подсказка «Нажмите пробел». Текст можно красить, сглаживать (антиалиасинг), накладывать на любую часть экрана.",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 200))\nfont = pygame.font.SysFont(\"Arial\", 36, bold=True)\ntext = font.render(\"Привет, игра!\", True, (255, 200, 0))\nrect = text.get_rect(center=(200, 100))\nscreen.fill((20, 30, 60))\nscreen.blit(text, rect)\npygame.display.flip()\nimport time; time.sleep(2)\npygame.quit()",
    syntaxNote:"render(текст, сглаживание, цвет). get_rect(center=(x,y)) — удобно центрировать. SysFont использует системный шрифт по имени."},
  {id:29, emoji:"🔊", title:"Звуки и музыка", level:"mid", group:"Pygame",
    intro:"Звуки оживляют игру! 🔊 Pygame различает короткие звуки (выстрел, прыжок) и фоновую музыку. Для звуков — pygame.mixer.Sound. Для музыки — pygame.mixer.music. Поддерживаются WAV, OGG, MP3. 🎵 Пример из жизни: «динь» при поднятии монеты, «бах» при прыжке, эпическая музыка на фоне босса — без звуков игра скучная. Громкость регулируется от 0.0 до 1.0. Музыку можно зациклить параметром loops=-1.",
    syntax:"import pygame\npygame.init()\npygame.mixer.init()\nscreen = pygame.display.set_mode((300, 200))\n# Замени пути на свои файлы\n# jump = pygame.mixer.Sound(\"jump.wav\")\n# pygame.mixer.music.load(\"bg.mp3\")\n# pygame.mixer.music.play(-1)\nrunning = True\nclock = pygame.time.Clock()\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        # if e.type == pygame.KEYDOWN: jump.play()\n    clock.tick(60)\npygame.quit()",
    syntaxNote:"Sound.play() — раз. music.play(-1) — бесконечно. set_volume(0.5) — половина громкости. Лучший формат для эффектов — WAV или OGG."},
  {id:30, emoji:"💥", title:"Столкновения (collision)", level:"mid", group:"Pygame",
    intro:"Столкновения — основа любой игры! 💥 Враг ударил героя, монета попала в карман, пуля задела цель — везде проверяется пересечение прямоугольников. У каждой фигуры есть rect (pygame.Rect), и метод colliderect(другой) возвращает True/False. 🎯 Пример из жизни: машинка врезалась в стену → проигрыш. Mario прыгнул на гриб → плюс жизнь. Снаряд попал во врага → минус здоровье. Всё это — colliderect.",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nclock = pygame.time.Clock()\nplayer = pygame.Rect(50, 130, 40, 40)\ncoin = pygame.Rect(300, 130, 30, 30)\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    keys = pygame.key.get_pressed()\n    if keys[pygame.K_RIGHT]: player.x += 4\n    if keys[pygame.K_LEFT]: player.x -= 4\n    if player.colliderect(coin):\n        coin.x = -100\n        print(\"Монета собрана!\")\n    screen.fill((0,0,30))\n    pygame.draw.rect(screen, (0,200,255), player)\n    pygame.draw.rect(screen, (255,215,0), coin)\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"pygame.Rect(x, y, ширина, высота). colliderect(другой) — пересечение. collidepoint(x,y) — попадает ли точка внутрь."},
  {id:31, emoji:"🦸", title:"Классы спрайтов", level:"hard", group:"Pygame",
    intro:"Когда объектов в игре много — пора использовать классы! 🦸 pygame.sprite.Sprite — это удобная база для героя, врага, пули. У спрайта есть image (картинка) и rect (положение и размер). Класс — это «чертёж», по которому делают много одинаковых объектов. 🏭 Пример из жизни: класс «Враг» — чертёж. Из него создают 20 врагов, у каждого свои координаты. Метод update() вызывается каждый кадр и обновляет состояние спрайта (двигает, проверяет столкновения).",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nclock = pygame.time.Clock()\n\nclass Player(pygame.sprite.Sprite):\n    def __init__(self):\n        super().__init__()\n        self.image = pygame.Surface((40, 40))\n        self.image.fill((0, 200, 100))\n        self.rect = self.image.get_rect(center=(200, 150))\n    def update(self):\n        keys = pygame.key.get_pressed()\n        if keys[pygame.K_LEFT]: self.rect.x -= 3\n        if keys[pygame.K_RIGHT]: self.rect.x += 3\n\np = Player()\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    p.update()\n    screen.fill((20,20,50))\n    screen.blit(p.image, p.rect)\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"Всегда super().__init__() в начале. image и rect — обязательные атрибуты Sprite. update() — основной метод логики."},
  {id:32, emoji:"👥", title:"Группы спрайтов", level:"hard", group:"Pygame",
    intro:"Группа — это коллекция спрайтов, которыми можно управлять разом! 👥 pygame.sprite.Group умеет обновлять всех спрайтов сразу (group.update()), рисовать всех (group.draw(screen)) и проверять столкновения между группами. 🐝 Пример из жизни: рой пчёл, дождь пуль, армия врагов — всё это группы. Метод spritecollide(спрайт, группа, удалять?) находит, с кем столкнулся один спрайт. groupcollide — между двумя группами.",
    syntax:"import pygame, random\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nclock = pygame.time.Clock()\n\nclass Coin(pygame.sprite.Sprite):\n    def __init__(self):\n        super().__init__()\n        self.image = pygame.Surface((16,16))\n        self.image.fill((255,215,0))\n        self.rect = self.image.get_rect(topleft=(random.randint(0,380), 0))\n    def update(self):\n        self.rect.y += 3\n        if self.rect.y > 300: self.kill()\n\ncoins = pygame.sprite.Group()\nrunning = True; t = 0\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    if t % 20 == 0: coins.add(Coin())\n    t += 1\n    coins.update()\n    screen.fill((20,20,40))\n    coins.draw(screen)\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"group.add(спрайт) — добавить. spritecollide(спрайт, группа, True) — найти столкновения и удалить. kill() удаляет спрайт из всех групп."},
  {id:33, emoji:"🎞️", title:"Анимация спрайтов", level:"hard", group:"Pygame",
    intro:"Анимация спрайта — это смена кадров (картинок) по очереди! 🎞️ У персонажа есть массив картинок [walk1, walk2, walk3, walk4] — каждые несколько кадров меняем self.image на следующий. Получается ходьба, прыжок, удар. 🏃‍♂️ Пример из жизни: бегущий Mario — это 3-4 картинки, меняющиеся 10 раз в секунду. Чтобы анимация не была слишком быстрой — используют счётчик: меняем кадр только каждые 6 тиков игры.",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((300, 200))\nclock = pygame.time.Clock()\nframes = []\nfor c in [(255,0,0),(255,165,0),(255,255,0),(0,255,0)]:\n    s = pygame.Surface((40,40)); s.fill(c); frames.append(s)\nidx = 0; t = 0\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    t += 1\n    if t % 10 == 0: idx = (idx + 1) % len(frames)\n    screen.fill((30,30,30))\n    screen.blit(frames[idx], (130, 80))\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"Списком кадров и счётчиком t контролируешь скорость. % len(frames) делает цикл бесконечным (после последнего — снова первый)."},
  {id:34, emoji:"🎥", title:"Скроллинг и камера", level:"hard", group:"Pygame",
    intro:"Когда мир больше экрана — нужна камера! 🎥 Идея: герой остаётся в центре, а двигается весь мир. Хранишь offset_x, offset_y — это смещение камеры. Каждый объект рисуешь на (object.x - offset_x, object.y - offset_y). 🗺️ Пример из жизни: в Mario экран движется за героем. В RPG карта прокручивается под игроком. Это и есть скроллинг. Камера может следить за героем строго или с лёгкой задержкой (smoothing).",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nclock = pygame.time.Clock()\nhero_x, hero_y = 1000, 150\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    keys = pygame.key.get_pressed()\n    if keys[pygame.K_LEFT]: hero_x -= 4\n    if keys[pygame.K_RIGHT]: hero_x += 4\n    cam_x = hero_x - 200\n    screen.fill((100,180,255))\n    for x in range(0, 2000, 100):\n        pygame.draw.rect(screen,(80,200,80),(x-cam_x,250,80,50))\n    pygame.draw.rect(screen,(255,0,0),(200,hero_y,30,40))\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"Камера = смещение от 0. Все объекты рисуй с учётом cam_x. Чтобы герой был в центре: cam_x = hero_x - screen_width//2."},
  {id:35, emoji:"🧱", title:"Уровни и тайлы", level:"hard", group:"Pygame",
    intro:"Тайлы — это клеточки, из которых собирают карту! 🧱 Уровень хранится как двумерный список: 0 — пусто, 1 — кирпич, 2 — монета. Цикл проходит по клеткам и рисует каждую. Это как конструктор LEGO для уровней! 🗺️ Пример из жизни: уровни Mario, Pacman, Sokoban — все из тайлов. Так гораздо проще делать большие карты — рисуешь карту в коде или в редакторе уровней, программа просто собирает её. Размер тайла обычно 16, 32 или 64 пикселя.",
    syntax:"import pygame\npygame.init()\nTILE = 40\nlevel = [\"##########\",\"#........#\",\"#..#####.#\",\"#........#\",\"##########\"]\nscreen = pygame.display.set_mode((TILE*10, TILE*5))\nclock = pygame.time.Clock()\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    screen.fill((220,220,220))\n    for y,row in enumerate(level):\n        for x,c in enumerate(row):\n            if c == \"#\":\n                pygame.draw.rect(screen,(80,40,20),(x*TILE,y*TILE,TILE,TILE))\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"Карта = двумерный массив. Координата клетки: (col*TILE, row*TILE). Так удобно делать стены, лестницы, монеты, врагов."},
  {id:36, emoji:"🏆", title:"Очки и счёт", level:"mid", group:"Pygame",
    intro:"Очки — главный смысл многих игр! 🏆 Хранишь переменную score, каждое полезное действие — score += 10. Каждый кадр рисуешь её на экране как текст. Можно хранить и рекорд (high score) в файле! 📊 Пример из жизни: счёт в Pacman, Tetris, Flappy Bird, очки в любой аркаде. Психология: визуальная награда (циферка растёт, анимация +10!) заставляет игрока продолжать. Чем сложнее действие — тем больше очков давать.",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nfont = pygame.font.SysFont(\"Arial\", 28, bold=True)\nclock = pygame.time.Clock()\nscore = 0; running = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        if e.type == pygame.MOUSEBUTTONDOWN: score += 10\n    screen.fill((30,30,30))\n    txt = font.render(f\"Очки: {score}\", True, (255,255,0))\n    screen.blit(txt, (20, 20))\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"Текст рендерится каждый кадр — это нормально. Чтобы сохранить рекорд: with open('score.txt','w') as f: f.write(str(score))."},
  {id:37, emoji:"❤️", title:"Жизни и Game Over", level:"mid", group:"Pygame",
    intro:"Жизни — это сколько раз игрок может ошибиться! ❤️ Обычно их 3. Каждое столкновение с врагом → lives -= 1. Когда lives == 0 → экран «Game Over». 💔 Пример из жизни: классические аркады, Pacman, Space Invaders — у тебя 3 попытки. После Game Over можно начать заново. Лучше показывать жизни иконками сердечек, а не цифрами — это красивее и понятнее даже маленьким игрокам.",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nfont = pygame.font.SysFont(\"Arial\", 48, bold=True)\nclock = pygame.time.Clock()\nlives = 3; running = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        if e.type == pygame.KEYDOWN: lives -= 1\n    screen.fill((20, 0, 20))\n    if lives > 0:\n        for i in range(lives):\n            pygame.draw.circle(screen,(255,0,80),(30+i*40,30),14)\n    else:\n        txt = font.render(\"GAME OVER\", True, (255,40,40))\n        screen.blit(txt, txt.get_rect(center=(200,150)))\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"Чтобы не убывала сразу несколько раз — используй pygame.time.get_ticks() и невосприимчивость (i-frames) на 1 секунду."},
  {id:38, emoji:"📱", title:"Меню в игре", level:"hard", group:"Pygame",
    intro:"Меню — это первое, что видит игрок! 📱 Играть, Настройки, Выход — кнопки в стартовом окне. Делают так: рисуешь прямоугольники с текстом, проверяешь клик мышью внутри прямоугольника, по клику переключаешь состояние игры (state). 🎬 Пример из жизни: главное меню в любой игре. Pause-меню по Escape. Экран выбора уровня. Все строятся одинаково: кнопки + проверка клика. Переменная state хранит: menu, game, pause, over.",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nfont = pygame.font.SysFont(\"Arial\", 30, bold=True)\nclock = pygame.time.Clock()\nstate = \"menu\"; running = True\nplay_btn = pygame.Rect(120, 110, 160, 50)\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        if e.type == pygame.MOUSEBUTTONDOWN and state == \"menu\":\n            if play_btn.collidepoint(e.pos): state = \"game\"\n    if state == \"menu\":\n        screen.fill((10,10,40))\n        pygame.draw.rect(screen,(0,150,255),play_btn,border_radius=10)\n        t = font.render(\"ИГРАТЬ\", True, (255,255,255))\n        screen.blit(t, t.get_rect(center=play_btn.center))\n    else:\n        screen.fill((30,80,30))\n        screen.blit(font.render(\"В игре!\", True, (255,255,255)), (130,130))\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"state — строка состояния. Каждый кадр if state == 'X': рисуй нужный экран. border_radius — скруглить углы прямоугольника."},
  {id:39, emoji:"👾", title:"Враги и простой AI", level:"hard", group:"Pygame",
    intro:"Врагам нужен «мозг» — простой алгоритм поведения! 👾 Базовые типы: ① патруль (ходит туда-сюда), ② преследователь (бежит к игроку), ③ стрелок (стоит и стреляет). Всё это — пара строк кода! 🧟 Пример из жизни: Гумбы Mario — патруль. Призраки Pacman — преследователи. Башни в Tower Defense — стрелки. Для «бежит к игроку»: если враг.x < игрок.x → враг.x += скорость; иначе → -=. Получается умное поведение из простых правил.",
    syntax:"import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nclock = pygame.time.Clock()\npx, py = 200, 150; ex, ey = 50, 50\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    keys = pygame.key.get_pressed()\n    px += (keys[pygame.K_RIGHT]-keys[pygame.K_LEFT])*4\n    py += (keys[pygame.K_DOWN]-keys[pygame.K_UP])*4\n    if ex < px: ex += 2\n    else: ex -= 2\n    if ey < py: ey += 2\n    else: ey -= 2\n    screen.fill((20,20,20))\n    pygame.draw.circle(screen,(0,255,0),(px,py),16)\n    pygame.draw.circle(screen,(255,0,0),(ex,ey),16)\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"Сравнения координат — самый простой AI. Можно добавить дистанцию: атакует только если близко. Состояния: 'patrol', 'chase', 'attack'."},
  {id:40, emoji:"🚀", title:"Мини-проекты Pygame", level:"hard", group:"Pygame",
    intro:"Время сделать настоящую игру! 🚀 С тем, что ты знаешь, можно собрать: Понг, Змейку, Flappy Bird, простой платформер, ловлю монет, мини-аркаду. Не пытайся сразу сделать GTA — начни с малого, добавляй фичи по одной. 🎯 Совет: ① сначала окно и герой, ② потом движение, ③ потом препятствия, ④ потом счёт, ⑤ потом звук, ⑥ потом меню. Каждый шаг — играй и проверяй. Готовую игру покажи друзьям — реакция будет огонь! 🔥",
    syntax:"import pygame, random\npygame.init()\nW, H = 400, 300\nscreen = pygame.display.set_mode((W, H))\nclock = pygame.time.Clock()\nplayer = pygame.Rect(W//2-20, H-30, 40, 20)\nballs = []\nscore = 0\nfont = pygame.font.SysFont(\"Arial\", 24, bold=True)\nrunning = True; t = 0\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    keys = pygame.key.get_pressed()\n    if keys[pygame.K_LEFT]: player.x -= 6\n    if keys[pygame.K_RIGHT]: player.x += 6\n    t += 1\n    if t % 25 == 0:\n        balls.append(pygame.Rect(random.randint(0,W-15), 0, 15, 15))\n    for b in balls[:]:\n        b.y += 4\n        if b.colliderect(player): balls.remove(b); score += 1\n        elif b.y > H: balls.remove(b)\n    screen.fill((10,10,40))\n    pygame.draw.rect(screen,(0,200,255),player)\n    for b in balls: pygame.draw.rect(screen,(255,200,0),b)\n    screen.blit(font.render(f\"Score: {score}\", True, (255,255,255)),(10,10))\n    pygame.display.flip(); clock.tick(60)\npygame.quit()",
    syntaxNote:"Главное правило: сделай ИГРАЕМУЮ версию за час. Потом полируй. Каждая мелочь (звук, эффект, анимация) добавляет +50% к веселью."},
];

function makeExamples(topic){
  // Если есть кастомные примеры по теме — используем их.
  const custom = (typeof TOPIC_EXAMPLES !== "undefined") && TOPIC_EXAMPLES[topic.id];
  if (custom && custom.length){
    return custom.map((ex, idx) => ({
      title: ex.title || `${topic.title} — пример ${idx+1}`,
      level: idx < 5 ? "Новичок" : idx < 10 ? "Средний" : "Продвинутый",
      code: ex.code,
      output: ex.output,
      explanation: ex.explanation || `Пример темы «${topic.title}».`
    }));
  }
  const out = [];
  for (let i = 1; i <= 15; i++){
    out.push({
      title: `${topic.title} — пример ${i}`,
      level: i <= 5 ? "Новичок" : i <= 10 ? "Средний" : "Продвинутый",
      code: topic.syntax + `\nprint("Пример ${i} темы: ${topic.title}")`,
      output: `Пример ${i} темы: ${topic.title}`,
      explanation: `Это ${i}-й пример темы «${topic.title}».`
    });
  }
  return out;
}


function makeQuiz(topic){
  const c = (typeof TOPIC_CONTENT!=="undefined") && TOPIC_CONTENT[topic.id];
  if (c && c.quiz) return c.quiz;
  return [{q:`Тема: ${topic.title}`, opts:["A","B","C","D"], answer:0}];
}


function makeTasks(topic){
  const c = (typeof TOPIC_CONTENT!=="undefined") && TOPIC_CONTENT[topic.id];
  if (c && c.tasks) return c.tasks;
  return [{q:`Задание по теме «${topic.title}»`, hint:"См. синтаксис темы.", solution:"# решение"}];
}


function makeBugs(){
  // Tkinter (15) + Pygame (15) — debug challenges for kids
  const tkBugs = [
    {
      title: "Первое окно Tkinter",
      broken: "import Tkinter as tk\nroot = tk.tk()\nroot.Title(\"Моё окно\")\nroot.geometry(400x300)\nlabel = tk.label(root text=\"Привет!\")\nlabel.Pack\nroot.mainloop",
      fixed: "import tkinter as tk\nroot = tk.Tk()\nroot.title(\"Моё окно\")\nroot.geometry(\"400x300\")\nlabel = tk.Label(root, text=\"Привет!\")\nlabel.pack()\nroot.mainloop()",
      errors: [
        "Tkinter с большой буквы — модуль называется tkinter",
        "tk.tk() должно быть tk.Tk()",
        "Title → title (метод с маленькой)",
        "400x300 — нужна строка в кавычках \"400x300\"",
        "tk.label → tk.Label (класс с большой)",
        "пропущена запятая между root и text=",
        "Pack — должно быть pack (нижний регистр)",
        "label.Pack без () — это не вызов метода",
        "mainloop без () — метод не вызван",
        "у Label свойство pack() вызывается, а не Pack"
      ]
    },
    {
      title: "Кнопка с обработчиком",
      broken: "from tkinter import *\ndef Click()\n    print(\"Клик!)\nroot = TK()\nbtn = button(root, text=\"Жми\" command=Click())\nbtn.pack\nroot.MainLoop()",
      fixed: "from tkinter import *\ndef click():\n    print(\"Клик!\")\nroot = Tk()\nbtn = Button(root, text=\"Жми\", command=click)\nbtn.pack()\nroot.mainloop()",
      errors: [
        "после def Click() пропущено двоеточие :",
        "не закрыта кавычка в print(\"Клик!)",
        "TK() — должно быть Tk()",
        "button → Button (класс с большой)",
        "пропущена запятая между \"Жми\" и command=",
        "command=Click() — передаётся результат, нужно command=Click (без скобок)",
        "btn.pack без () — метод не вызван",
        "MainLoop → mainloop",
        "имя функции лучше с маленькой (click)",
        "стиль: команда должна быть ссылкой на функцию, а не её вызовом"
      ]
    },
    {
      title: "Поле ввода Entry",
      broken: "from tkinter import *\nroot = Tk()\nentry = Entry()\ndef show():\n    text = entry.value()\n    print(text)\nbtn = Button(root text=\"Показать\", command=show)\nentry.Pack()\nbtn.pack\nLabel(root, Text=\"Введи имя:\").pack()\nroot.mainloop",
      fixed: "from tkinter import *\nroot = Tk()\nLabel(root, text=\"Введи имя:\").pack()\nentry = Entry(root)\nentry.pack()\ndef show():\n    text = entry.get()\n    print(text)\nbtn = Button(root, text=\"Показать\", command=show)\nbtn.pack()\nroot.mainloop()",
      errors: [
        "Entry() без аргумента root — нужно Entry(root)",
        "entry.value() — у Entry метод get(), а не value()",
        "пропущена запятая между root и text=",
        "entry.Pack() → entry.pack()",
        "btn.pack без () — метод не вызван",
        "Text= → text= (атрибут с маленькой)",
        "Label лучше создавать до поля ввода",
        "root.mainloop без () — не вызван",
        "переменная text затеняет встроенное имя — стиль",
        "порядок виджетов: метка обычно перед полем ввода"
      ]
    },
    {
      title: "StringVar и связывание",
      broken: "import tkinter as tk\nroot = tk.Tk()\nname = tk.stringVar()\nname.Set(\"Аня\")\nentry = tk.Entry(root, textvariable=name())\ndef show()\n    print(name.value)\ntk.Button(root text=\"OK\", command=show).pack()\nentry.pack\nroot.mainloop",
      fixed: "import tkinter as tk\nroot = tk.Tk()\nname = tk.StringVar()\nname.set(\"Аня\")\nentry = tk.Entry(root, textvariable=name)\ndef show():\n    print(name.get())\ntk.Button(root, text=\"OK\", command=show).pack()\nentry.pack()\nroot.mainloop()",
      errors: [
        "tk.stringVar → tk.StringVar (класс с большой)",
        "Set → set (метод с маленькой)",
        "textvariable=name() — передаётся не вызов, а сам объект: name",
        "после def show() пропущено двоеточие :",
        "name.value — нужно name.get()",
        "пропущена запятая между root и text=",
        "entry.pack без () — метод не вызван",
        "root.mainloop без () — не вызван",
        "StringVar нужно создавать после Tk()",
        "стиль: имена методов tkinter всегда в нижнем регистре"
      ]
    },
    {
      title: "Pack: side и fill",
      broken: "from tkinter import *\nroot = Tk()\nframe = Frame(root)\nframe.Pack(fill=BOTH, expand=true)\nLabel(frame, Text=\"Лево\", bg=red).pack(side=Left, Fill=Y)\nLabel(frame, text=\"Право\", bg=\"blue\").pack(side=\"RIGHT\" fill=\"y\")\nButton(frame, text=\"OK\").pack(side=bottom)\nroot.MainLoop",
      fixed: "from tkinter import *\nroot = Tk()\nframe = Frame(root)\nframe.pack(fill=BOTH, expand=True)\nLabel(frame, text=\"Лево\", bg=\"red\").pack(side=LEFT, fill=Y)\nLabel(frame, text=\"Право\", bg=\"blue\").pack(side=\"right\", fill=\"y\")\nButton(frame, text=\"OK\").pack(side=BOTTOM)\nroot.mainloop()",
      errors: [
        "frame.Pack → frame.pack",
        "true → True (Python с большой буквы)",
        "Text= → text=",
        "bg=red — red это переменная; нужно \"red\" в кавычках",
        "side=Left — нужна константа LEFT (или строка \"left\")",
        "Fill=Y → fill=Y",
        "пропущена запятая перед fill=\"y\"",
        "side=\"RIGHT\" — строка должна быть в нижнем регистре \"right\"",
        "side=bottom — переменная; нужно BOTTOM или \"bottom\"",
        "MainLoop → mainloop, плюс не вызван — нужно ()"
      ]
    },
    {
      title: "Grid layout",
      broken: "from tkinter import *\nroot = Tk()\nLabel(root, text=\"Имя\").grid(row=0 column=0)\nEntry(root).Grid(row=0, column=1)\nLabel(root, text=\"Фамилия\").grid(Row=1, column=0)\nEntry(root).grid(row=\"1\", column=1)\nButton(root, text=\"OK\").grid(row=2, column=0, columnSpan=2)\nroot.geometry(300, 200)\nroot.mainloop",
      fixed: "from tkinter import *\nroot = Tk()\nLabel(root, text=\"Имя\").grid(row=0, column=0)\nEntry(root).grid(row=0, column=1)\nLabel(root, text=\"Фамилия\").grid(row=1, column=0)\nEntry(root).grid(row=1, column=1)\nButton(root, text=\"OK\").grid(row=2, column=0, columnspan=2)\nroot.geometry(\"300x200\")\nroot.mainloop()",
      errors: [
        "пропущена запятая между row=0 и column=0",
        "Grid → grid (нижний регистр)",
        "Row= → row=",
        "row=\"1\" — должно быть число, не строка",
        "columnSpan → columnspan (нижний регистр)",
        "root.geometry(300, 200) — нужна строка \"300x200\"",
        "root.mainloop без () — не вызван",
        "Tkinter не принимает camelCase в аргументах",
        "geometry принимает один строковый аргумент",
        "стиль: согласованность типов в одном вызове"
      ]
    },
    {
      title: "Place layout",
      broken: "from tkinter import *\nroot = Tk()\nroot.geometry(\"300x200\")\nLabel(root, text=\"A\").Place(x=10, y=10)\nLabel(root, text=\"B\").place(X=100 Y=10)\nLabel(root, text=\"C\").place(x=\"50\", y=\"50\")\nButton(root, text=\"OK\").place(relx=2, rely=0.5 anchor=center)\nroot.MainLoop",
      fixed: "from tkinter import *\nroot = Tk()\nroot.geometry(\"300x200\")\nLabel(root, text=\"A\").place(x=10, y=10)\nLabel(root, text=\"B\").place(x=100, y=10)\nLabel(root, text=\"C\").place(x=50, y=50)\nButton(root, text=\"OK\").place(relx=0.5, rely=0.5, anchor=\"center\")\nroot.mainloop()",
      errors: [
        "Place → place",
        "X= → x= (нижний регистр)",
        "пропущена запятая между X=100 и Y=10",
        "Y= → y=",
        "x=\"50\" — нужно число",
        "relx=2 — относительная координата от 0 до 1",
        "пропущена запятая перед anchor=",
        "anchor=center — center это переменная; нужно \"center\" или CENTER",
        "MainLoop → mainloop",
        "mainloop не вызван — нужно ()"
      ]
    },
    {
      title: "Bind: события клавиатуры",
      broken: "import tkinter as tk\nroot = tk.Tk()\ndef on_key(event)\n    print(\"Нажата:\" Event.char)\nroot.bind(<Key>, on_key())\nroot.Bind(\"<Escape>\", lambda e root.quit())\nentry = tk.Entry(root)\nentry.bind(\"Return\", on_key)\nentry.pack\nroot.mainloop",
      fixed: "import tkinter as tk\nroot = tk.Tk()\ndef on_key(event):\n    print(\"Нажата:\", event.char)\nroot.bind(\"<Key>\", on_key)\nroot.bind(\"<Escape>\", lambda e: root.quit())\nentry = tk.Entry(root)\nentry.bind(\"<Return>\", on_key)\nentry.pack()\nroot.mainloop()",
      errors: [
        "после def on_key(event) пропущено двоеточие :",
        "Event.char — параметр функции называется event (с маленькой)",
        "пропущена запятая между \"Нажата:\" и event.char",
        "<Key> без кавычек — должна быть строка \"<Key>\"",
        "on_key() — передаётся результат; нужно on_key без скобок",
        "Bind → bind (нижний регистр)",
        "в lambda пропущено двоеточие: lambda e: root.quit()",
        "\"Return\" — событие надо писать как \"<Return>\"",
        "entry.pack без () — не вызван",
        "root.mainloop без () — не вызван"
      ]
    },
    {
      title: "Messagebox диалоги",
      broken: "import tkinter as tk\nfrom tkinter import messageBox\nroot = tk.Tk()\ndef ask()\n    res = messagebox.AskYesNo(\"Вопрос\" \"Точно выйти?\")\n    if res = True:\n        root.quit\ntk.Button(root, text=\"Выйти\", command=ask()).pack\nmessagebox.showinfo(\"Привет\")\nroot.mainloop",
      fixed: "import tkinter as tk\nfrom tkinter import messagebox\nroot = tk.Tk()\ndef ask():\n    res = messagebox.askyesno(\"Вопрос\", \"Точно выйти?\")\n    if res == True:\n        root.quit()\ntk.Button(root, text=\"Выйти\", command=ask).pack()\nmessagebox.showinfo(\"Привет\", \"Окно загружено\")\nroot.mainloop()",
      errors: [
        "messageBox → messagebox (нижний регистр)",
        "после def ask() пропущено двоеточие :",
        "AskYesNo → askyesno (всё с маленькой)",
        "пропущена запятая между \"Вопрос\" и \"Точно выйти?\"",
        "if res = True — присваивание; нужно == для сравнения",
        "root.quit без () — не вызван",
        "command=ask() — передаётся результат; нужно command=ask",
        ".pack без () — не вызван",
        "showinfo требует минимум title и message — пропущен второй аргумент",
        "root.mainloop без ()"
      ]
    },
    {
      title: "Listbox",
      broken: "from tkinter import *\nroot = Tk()\nlst = listBox(root)\nfruits = [\"яблоко\" \"груша\" \"слива\"]\nfor f in fruits\n    lst.Insert(END, f)\ndef show():\n    i = lst.curselection\n    print(lst.get(i))\nButton(root, text=\"Выбрать\", command=show).pack\nlst.pack\nroot.mainloop",
      fixed: "from tkinter import *\nroot = Tk()\nlst = Listbox(root)\nfruits = [\"яблоко\", \"груша\", \"слива\"]\nfor f in fruits:\n    lst.insert(END, f)\ndef show():\n    i = lst.curselection()\n    if i:\n        print(lst.get(i[0]))\nButton(root, text=\"Выбрать\", command=show).pack()\nlst.pack()\nroot.mainloop()",
      errors: [
        "listBox → Listbox (класс)",
        "в списке fruits пропущены запятые",
        "после for f in fruits пропущено двоеточие :",
        "Insert → insert",
        "lst.curselection — без () метод не вызван",
        "curselection возвращает кортеж индексов, нужен i[0]",
        "если ничего не выбрано — будет ошибка, нужна проверка if i",
        "Button .pack без () — не вызван",
        "lst.pack без () — не вызван",
        "root.mainloop без ()"
      ]
    },
    {
      title: "Checkbutton и Radiobutton",
      broken: "from tkinter import *\nroot = Tk()\nv = IntVar\nv.Set(0)\nRadiobutton(root, text=\"A\" variable=v value=1).pack()\nRadiobutton(root, text=\"B\", variable=v, value=\"2\").pack()\nagree = BooleanVar()\nCheckbutton(root, text=\"Согласен\", variable=agree).Pack\ndef ok():\n    print(v.value(), agree.get)\nButton(root, text=\"OK\" command=ok).pack\nroot.mainloop",
      fixed: "from tkinter import *\nroot = Tk()\nv = IntVar()\nv.set(0)\nRadiobutton(root, text=\"A\", variable=v, value=1).pack()\nRadiobutton(root, text=\"B\", variable=v, value=2).pack()\nagree = BooleanVar()\nCheckbutton(root, text=\"Согласен\", variable=agree).pack()\ndef ok():\n    print(v.get(), agree.get())\nButton(root, text=\"OK\", command=ok).pack()\nroot.mainloop()",
      errors: [
        "IntVar — пропущены скобки вызова: IntVar()",
        "Set → set",
        "пропущены запятые между text=\"A\", variable=v и value=1",
        "value=\"2\" — должно быть число 2",
        ".Pack → .pack, плюс без () — не вызван",
        "v.value() — у IntVar метод get(), а не value()",
        "agree.get — без () метод не вызван",
        "пропущена запятая между text=\"OK\" и command=ok",
        "Button .pack без () — не вызван",
        "root.mainloop без ()"
      ]
    },
    {
      title: "Menu",
      broken: "from tkinter import *\nroot = Tk()\nmenubar = menu(root)\nfile = Menu(menubar tearoff=1)\nfile.add_Command(label=\"Открыть\", command=lambda: print(\"открыто\"))\nfile.add_command(label=\"Выход\" command=root.quit())\nmenubar.add_cascade(label=\"Файл\", menu=file())\nroot.Config(menu=menubar)\nroot.mainloop",
      fixed: "from tkinter import *\nroot = Tk()\nmenubar = Menu(root)\nfile = Menu(menubar, tearoff=0)\nfile.add_command(label=\"Открыть\", command=lambda: print(\"открыто\"))\nfile.add_command(label=\"Выход\", command=root.quit)\nmenubar.add_cascade(label=\"Файл\", menu=file)\nroot.config(menu=menubar)\nroot.mainloop()",
      errors: [
        "menu → Menu (класс с большой)",
        "пропущена запятая между menubar и tearoff=",
        "tearoff=1 обычно ставят 0, чтобы убрать пунктир (логическая ошибка)",
        "add_Command → add_command (нижний регистр)",
        "пропущена запятая между \"Выход\" и command=",
        "command=root.quit() — передаётся результат; нужно root.quit",
        "menu=file() — file это уже объект, не функция; нужно menu=file",
        "Config → config",
        "root.mainloop без () — не вызван",
        "у Menu методы только с маленькой буквы"
      ]
    },
    {
      title: "Canvas: фигуры",
      broken: "from tkinter import *\nroot = Tk()\nc = canvas(root width=400, height=300, bg=white)\nc.pack\nc.create_Rectangle(50, 50, 150 100, fill=\"red\")\nc.create_oval(200, 50, 300, 150, Fill=\"blue\")\nc.create_line(0, 0, 400, 300, Width=3)\nc.create_text(200, 250, text=\"Привет\" Font=(\"Arial\", 16))\nroot.mainloop",
      fixed: "from tkinter import *\nroot = Tk()\nc = Canvas(root, width=400, height=300, bg=\"white\")\nc.pack()\nc.create_rectangle(50, 50, 150, 100, fill=\"red\")\nc.create_oval(200, 50, 300, 150, fill=\"blue\")\nc.create_line(0, 0, 400, 300, width=3)\nc.create_text(200, 250, text=\"Привет\", font=(\"Arial\", 16))\nroot.mainloop()",
      errors: [
        "canvas → Canvas (класс с большой)",
        "пропущена запятая между root и width=",
        "bg=white — white это переменная; нужно \"white\"",
        "c.pack без () — не вызван",
        "create_Rectangle → create_rectangle",
        "пропущена запятая между 150 и 100",
        "Fill= → fill=",
        "Width= → width=",
        "пропущена запятая между \"Привет\" и Font=",
        "Font= → font= (нижний регистр)"
      ]
    },
    {
      title: "Canvas: анимация after()",
      broken: "import tkinter as tk\nroot = tk.Tk()\nc = tk.Canvas(root, width=400, height=300, bg=\"white\")\nc.pack()\nball = c.create_oval(0, 0, 30, 30, fill=\"red\")\nx = 0\ndef move()\n    Global x\n    x = x + 5\n    c.move(ball 5, 0)\n    if x > 400\n        x = 0\n    root.After(50 move)\nmove\nroot.mainloop",
      fixed: "import tkinter as tk\nroot = tk.Tk()\nc = tk.Canvas(root, width=400, height=300, bg=\"white\")\nc.pack()\nball = c.create_oval(0, 0, 30, 30, fill=\"red\")\nx = 0\ndef move():\n    global x\n    x = x + 5\n    c.move(ball, 5, 0)\n    if x > 400:\n        x = 0\n    root.after(50, move)\nmove()\nroot.mainloop()",
      errors: [
        "после def move() пропущено двоеточие :",
        "Global → global (с маленькой)",
        "пропущена запятая между ball и 5",
        "после if x > 400 пропущено двоеточие :",
        "After → after (нижний регистр)",
        "пропущена запятая между 50 и move",
        "move — без () функция не вызвана для старта",
        "root.mainloop без () — не вызван",
        "при x>400 нужно сбросить и позицию шарика c.coords",
        "5 — лучше вынести в переменную скорости (стиль)"
      ]
    },
    {
      title: "Калькулятор GUI",
      broken: "from tkinter import *\nroot = Tk()\na = Entry(root); a.Pack()\nb = Entry(root); b.pack\ndef calc()\n    x = a.get()\n    y = b.get()\n    result = x + y\n    label.config(Text=\"Сумма: \" + result)\nlabel = Label(root text=\"?\")\nlabel.pack\nButton(root, text=\"=\", command=calc()).pack\nroot.mainloop",
      fixed: "from tkinter import *\nroot = Tk()\na = Entry(root); a.pack()\nb = Entry(root); b.pack()\nlabel = Label(root, text=\"?\")\nlabel.pack()\ndef calc():\n    x = int(a.get())\n    y = int(b.get())\n    result = x + y\n    label.config(text=\"Сумма: \" + str(result))\nButton(root, text=\"=\", command=calc).pack()\nroot.mainloop()",
      errors: [
        "a.Pack → a.pack",
        "b.pack без () — не вызван",
        "после def calc() пропущено двоеточие :",
        "a.get() возвращает строку — нужно int(...)",
        "b.get() возвращает строку — нужно int(...)",
        "result — число, нужно str(result) перед сложением со строкой",
        "Text= → text=",
        "label используется внутри calc до создания — переставить определение",
        "пропущена запятая между root и text=\"?\"",
        "command=calc() — передаётся результат; нужно command=calc",
        "Button .pack без () — не вызван"
      ]
    },
  ];
  const pgBugs = [
    {
      title: "Первое окно Pygame",
      broken: "import Pygame\npygame.Init()\nscreen = pygame.display.set_Mode(800 600)\npygame.display.Set_caption(\"Игра\")\nrunning = true\nwhile running:\n    for event in pygame.event.get\n        if event.type == pygame.quit:\n            running = False\n    screen.Fill((0, 0, 0))\n    pygame.display.Flip\npygame.quit",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((800, 600))\npygame.display.set_caption(\"Игра\")\nrunning = True\nwhile running:\n    for event in pygame.event.get():\n        if event.type == pygame.QUIT:\n            running = False\n    screen.fill((0, 0, 0))\n    pygame.display.flip()\npygame.quit()",
      errors: [
        "Pygame → pygame (модуль с маленькой)",
        "Init → init",
        "set_Mode → set_mode",
        "set_mode принимает кортеж (800, 600), а не два аргумента",
        "Set_caption → set_caption",
        "true → True (Python с большой)",
        "pygame.event.get — без () метод не вызван",
        "pygame.quit — константа события называется pygame.QUIT (заглавные)",
        "Fill → fill",
        "Flip → flip, плюс без () — не вызван; pygame.quit() в конце тоже не вызван"
      ]
    },
    {
      title: "Игровой цикл и FPS",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((640, 480))\nclock = pygame.time.clock()\nrunning = True\nwhile running\n    for event in pygame.event.get():\n        if event.type = pygame.QUIT:\n            running = false\n    screen.fill(\"white\")\n    pygame.display.update\n    clock.Tick(60)\npygame.Quit()",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((640, 480))\nclock = pygame.time.Clock()\nrunning = True\nwhile running:\n    for event in pygame.event.get():\n        if event.type == pygame.QUIT:\n            running = False\n    screen.fill((255, 255, 255))\n    pygame.display.update()\n    clock.tick(60)\npygame.quit()",
      errors: [
        "pygame.time.clock — Clock с большой буквы",
        "после while running пропущено двоеточие :",
        "if event.type = pygame.QUIT — присваивание; нужно ==",
        "false → False",
        "screen.fill(\"white\") — нужен кортеж RGB (255,255,255)",
        "pygame.display.update — без () не вызван",
        "Tick → tick (метод с маленькой)",
        "Quit → quit (функция с маленькой)",
        "clock.tick должен быть внутри цикла (он там, но проверь логику)",
        "стиль: цвета лучше выносить в константы"
      ]
    },
    {
      title: "Отрисовка фигур",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nRED = (255 0, 0)\nBLUE = \"blue\"\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = false\n    screen.fill((0,0,0))\n    pygame.draw.Rect(screen, RED, (50, 50, 100, 100))\n    pygame.draw.circle(screen BLUE, (200, 200), 40)\n    pygame.draw.line(screen, (0,255,0), (0,0) (400,400), Width=3)\n    pygame.display.flip\npygame.quit()",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nRED = (255, 0, 0)\nBLUE = (0, 0, 255)\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    screen.fill((0, 0, 0))\n    pygame.draw.rect(screen, RED, (50, 50, 100, 100))\n    pygame.draw.circle(screen, BLUE, (200, 200), 40)\n    pygame.draw.line(screen, (0, 255, 0), (0, 0), (400, 400), 3)\n    pygame.display.flip()\npygame.quit()",
      errors: [
        "в кортеже RED пропущена запятая между 255 и 0",
        "BLUE = \"blue\" — Pygame ждёт кортеж RGB",
        "false → False",
        "draw.Rect → draw.rect (функции с маленькой)",
        "пропущена запятая между screen и BLUE в draw.circle",
        "пропущена запятая между (0,0) и (400,400)",
        "Width= → ширина передаётся позиционно, без имени; параметр называется width",
        "pygame.display.flip без () — не вызван",
        "стиль: цвета определять как константы один раз",
        "при QUIT логичнее break или сразу выйти (стиль)"
      ]
    },
    {
      title: "Управление с клавиатуры",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((600, 400))\nx, y = 100, 100\nclock = pygame.time.Clock()\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    keys = pygame.key.get_pressed\n    if keys[pygame.k_LEFT]:  x = x - 5\n    if keys[pygame.K_RIGHT]: x =+ 5\n    if keys[pygame.K_UP]:    y -= \"5\"\n    if keys[pygame.K_DOWN]   y += 5\n    screen.fill((0,0,0))\n    pygame.draw.rect(screen, (255,0,0), (x, y, 40, 40))\n    pygame.display.flip()\n    clock.Tick(60)\npygame.quit()",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((600, 400))\nx, y = 100, 100\nclock = pygame.time.Clock()\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    keys = pygame.key.get_pressed()\n    if keys[pygame.K_LEFT]:  x -= 5\n    if keys[pygame.K_RIGHT]: x += 5\n    if keys[pygame.K_UP]:    y -= 5\n    if keys[pygame.K_DOWN]:  y += 5\n    screen.fill((0, 0, 0))\n    pygame.draw.rect(screen, (255, 0, 0), (x, y, 40, 40))\n    pygame.display.flip()\n    clock.tick(60)\npygame.quit()",
      errors: [
        "get_pressed — без () метод не вызван",
        "k_LEFT — должно быть K_LEFT (заглавные)",
        "x =+ 5 — это x = +5; нужно x += 5",
        "y -= \"5\" — нельзя вычитать строку из числа",
        "после keys[pygame.K_DOWN] пропущено двоеточие :",
        "Tick → tick",
        "стиль: скорость в переменную SPEED",
        "движение должно зависеть от dt или быть постоянным fps",
        "проверка ключей лучше через elif для одного направления (стиль)",
        "лучше использовать pygame.event.poll или общий клок (стиль)"
      ]
    },
    {
      title: "События мыши",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        if e.type == pygame.MouseButtonDown:\n            pos = pygame.mouse.get_pos\n            print(\"Клик в\" pos)\n        if e.type = pygame.MOUSEMOTION:\n            print(e.Pos)\n    screen.fill((0,0,0))\n    pygame.display.Flip()\npygame.Quit",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        if e.type == pygame.MOUSEBUTTONDOWN:\n            pos = pygame.mouse.get_pos()\n            print(\"Клик в\", pos)\n        if e.type == pygame.MOUSEMOTION:\n            print(e.pos)\n    screen.fill((0, 0, 0))\n    pygame.display.flip()\npygame.quit()",
      errors: [
        "MouseButtonDown → MOUSEBUTTONDOWN (заглавные)",
        "get_pos — без () метод не вызван",
        "пропущена запятая между \"Клик в\" и pos",
        "if e.type = pygame.MOUSEMOTION — = это присваивание; нужно ==",
        "e.Pos → e.pos (атрибут с маленькой)",
        "Flip → flip",
        "pygame.Quit — должно быть pygame.quit",
        "pygame.quit без () — не вызван",
        "стиль: print мыши лучше глушить (много логов)",
        "для движения курсора лучше использовать get_pos() в цикле"
      ]
    },
    {
      title: "Загрузка изображения",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nimg = pygame.image.Load(\"hero.png\")\nimg = pygame.transform.Scale(img (64, 64))\nx, y = 0, 0\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = false\n    screen.Fill((0,0,0))\n    screen.blit(img (x, y))\n    pygame.display.flip\npygame.quit()",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nimg = pygame.image.load(\"hero.png\").convert_alpha()\nimg = pygame.transform.scale(img, (64, 64))\nx, y = 0, 0\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    screen.fill((0, 0, 0))\n    screen.blit(img, (x, y))\n    pygame.display.flip()\npygame.quit()",
      errors: [
        "image.Load → image.load",
        "после load полезно вызвать convert() или convert_alpha() для скорости",
        "transform.Scale → transform.scale",
        "пропущена запятая между img и (64, 64) в scale",
        "false → False",
        "Fill → fill",
        "пропущена запятая между img и (x, y) в blit",
        "pygame.display.flip без () — не вызван",
        "лучше предзагружать изображения вне цикла (уже снаружи, ок) — стиль",
        "стиль: путь к файлу лучше через переменную/константу"
      ]
    },
    {
      title: "Звук и музыка",
      broken: "import pygame\npygame.init()\npygame.mixer.Init()\nsnd = pygame.mixer.sound(\"hit.wav\")\npygame.mixer.music.Load(\"bg.mp3\")\npygame.mixer.music.Play(loops=-1)\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        if e.type == pygame.KEYDOWN\n            snd.Play()\npygame.mixer.music.stop\npygame.Quit()",
      fixed: "import pygame\npygame.init()\npygame.mixer.init()\nsnd = pygame.mixer.Sound(\"hit.wav\")\npygame.mixer.music.load(\"bg.mp3\")\npygame.mixer.music.play(loops=-1)\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        if e.type == pygame.KEYDOWN:\n            snd.play()\npygame.mixer.music.stop()\npygame.quit()",
      errors: [
        "mixer.Init → mixer.init",
        "mixer.sound → mixer.Sound (класс с большой)",
        "music.Load → music.load",
        "music.Play → music.play",
        "после if e.type == pygame.KEYDOWN пропущено двоеточие :",
        "snd.Play → snd.play",
        "music.stop без () — не вызван",
        "pygame.Quit — должно быть pygame.quit",
        "pygame.quit без () — не вызван",
        "стиль: pygame.mixer.init желательно вызывать до загрузки звуков (порядок ок, но проверь)"
      ]
    },
    {
      title: "Шрифты и текст",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 200))\nfont = pygame.Font.SysFont(\"Arial\" 32)\ntext = font.Render(\"Привет!\", True (255,255,255))\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    screen.fill((0,0,0))\n    screen.blit(text (50, 80))\n    pygame.display.flip\npygame.quit",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 200))\nfont = pygame.font.SysFont(\"Arial\", 32)\ntext = font.render(\"Привет!\", True, (255, 255, 255))\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    screen.fill((0, 0, 0))\n    screen.blit(text, (50, 80))\n    pygame.display.flip()\npygame.quit()",
      errors: [
        "pygame.Font → pygame.font (модуль с маленькой)",
        "пропущена запятая между \"Arial\" и 32",
        "font.Render → font.render",
        "пропущена запятая между True и (255,255,255)",
        "пропущена запятая между text и (50, 80) в blit",
        "pygame.display.flip без () — не вызван",
        "pygame.quit без () — не вызван",
        "render возвращает Surface — лучше создавать один раз вне цикла (так и есть, ок)",
        "стиль: цвет вынести в константу",
        "стиль: размер шрифта в константу"
      ]
    },
    {
      title: "Столкновения: Rect.colliderect",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nplayer = pygame.rect(50, 50, 40, 40)\nenemy = pygame.Rect(200, 200, 40 40)\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    keys = pygame.key.get_pressed()\n    if keys[pygame.K_RIGHT]: player.x =+ 3\n    if player.colliderect(enemy)\n        print(\"Столкновение!)\n    screen.fill((0,0,0))\n    pygame.draw.rect(screen, (0,255,0), player)\n    pygame.draw.rect(screen, (255,0,0) enemy)\n    pygame.display.flip()\npygame.quit",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nplayer = pygame.Rect(50, 50, 40, 40)\nenemy = pygame.Rect(200, 200, 40, 40)\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    keys = pygame.key.get_pressed()\n    if keys[pygame.K_RIGHT]: player.x += 3\n    if player.colliderect(enemy):\n        print(\"Столкновение!\")\n    screen.fill((0, 0, 0))\n    pygame.draw.rect(screen, (0, 255, 0), player)\n    pygame.draw.rect(screen, (255, 0, 0), enemy)\n    pygame.display.flip()\npygame.quit()",
      errors: [
        "pygame.rect → pygame.Rect (класс с большой)",
        "пропущена запятая между 40 и 40 в Rect врага",
        "player.x =+ 3 — это присваивание +3; нужно +=",
        "после if player.colliderect(enemy) пропущено двоеточие :",
        "не закрыта кавычка в \"Столкновение!)",
        "пропущена запятая между (255,0,0) и enemy",
        "pygame.quit без () — не вызван",
        "стиль: скорость в переменную SPEED",
        "стиль: вынести цвета в константы",
        "после столкновения логично остановить движение (логика)"
      ]
    },
    {
      title: "Спрайт-классы",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\n\nclass player(pygame.sprite.Sprite):\n    def __init__(self):\n        super().__init__\n        self.image = pygame.Surface((40 40))\n        self.image.fill((0,255,0))\n        self.Rect = self.image.get_rect(topleft=(50,50))\n    def update(self):\n        self.rect.x =+ 2\n\np = Player()\ngroup = pygame.sprite.group()\ngroup.Add(p)\nclock = pygame.time.Clock()\nwhile True:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: pygame.quit(); exit()\n    group.update()\n    screen.fill((0,0,0))\n    group.draw(screen)\n    pygame.display.flip\n    clock.tick(60)",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\n\nclass Player(pygame.sprite.Sprite):\n    def __init__(self):\n        super().__init__()\n        self.image = pygame.Surface((40, 40))\n        self.image.fill((0, 255, 0))\n        self.rect = self.image.get_rect(topleft=(50, 50))\n    def update(self):\n        self.rect.x += 2\n\np = Player()\ngroup = pygame.sprite.Group()\ngroup.add(p)\nclock = pygame.time.Clock()\nwhile True:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: pygame.quit(); exit()\n    group.update()\n    screen.fill((0, 0, 0))\n    group.draw(screen)\n    pygame.display.flip()\n    clock.tick(60)",
      errors: [
        "class player — соглашение: классы с большой; используется Player ниже",
        "super().__init__ — без () не вызван",
        "пропущена запятая между 40 и 40 в Surface",
        "self.Rect — должно быть self.rect (нижний регистр), иначе group.draw не найдёт",
        "self.rect.x =+ 2 — это присваивание +2; нужно +=",
        "sprite.group → sprite.Group (класс с большой)",
        "group.Add → group.add",
        "pygame.display.flip без () — не вызван",
        "тело класса должно идти после объявления — переменная Player используется до фикса имени",
        "стиль: вместо exit() лучше break и pygame.quit() после цикла"
      ]
    },
    {
      title: "Группы спрайтов и пули",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nbullets = pygame.sprite.Group\nclass Bullet(pygame.sprite.Sprite):\n    def __init__(self, x, y):\n        super().__init__()\n        self.image = pygame.Surface((5,5))\n        self.image.fill((255,255,0))\n        self.rect = self.image.get_rect(center=(x y))\n    def update(self):\n        self.rect.y -= 4\n        if self.rect.bottom < 0:\n            self.kill\nwhile True:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: pygame.quit(); break\n        if e.type == pygame.KEYDOWN and e.key == pygame.K_SPACE:\n            bullets.Add(Bullet(200, 380))\n    bullets.update\n    screen.fill((0,0,0))\n    bullets.Draw(screen)\n    pygame.display.flip()",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nbullets = pygame.sprite.Group()\nclass Bullet(pygame.sprite.Sprite):\n    def __init__(self, x, y):\n        super().__init__()\n        self.image = pygame.Surface((5, 5))\n        self.image.fill((255, 255, 0))\n        self.rect = self.image.get_rect(center=(x, y))\n    def update(self):\n        self.rect.y -= 4\n        if self.rect.bottom < 0:\n            self.kill()\nwhile True:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: pygame.quit(); exit()\n        if e.type == pygame.KEYDOWN and e.key == pygame.K_SPACE:\n            bullets.add(Bullet(200, 380))\n    bullets.update()\n    screen.fill((0, 0, 0))\n    bullets.draw(screen)\n    pygame.display.flip()",
      errors: [
        "sprite.Group — без () не создан объект",
        "пропущена запятая между x и y в center=(x y)",
        "self.kill — без () метод не вызван",
        "break после pygame.quit() выходит только из for — лучше exit()/sys.exit()",
        "bullets.Add → bullets.add",
        "bullets.update — без () не вызван",
        "bullets.Draw → bullets.draw",
        "класс Bullet должен быть определён до того, как используется (он выше while, ок) — но стиль",
        "стиль: цвет и скорость в константы",
        "не контролируется FPS — нужен Clock().tick()"
      ]
    },
    {
      title: "Счётчик и шрифт в HUD",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 200))\nscore = 0\nfont = pygame.font.sysfont(None 24)\nrunning = true\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        if e.type == pygame.KEYDOWN: score =+ 1\n    screen.Fill((0,0,0))\n    text = font.render(\"Score:\" + score True, (255,255,255))\n    screen.blit(text, (10 10))\n    pygame.display.flip()\npygame.quit",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 200))\nscore = 0\nfont = pygame.font.SysFont(None, 24)\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n        if e.type == pygame.KEYDOWN: score += 1\n    screen.fill((0, 0, 0))\n    text = font.render(\"Score: \" + str(score), True, (255, 255, 255))\n    screen.blit(text, (10, 10))\n    pygame.display.flip()\npygame.quit()",
      errors: [
        "font.sysfont → font.SysFont (camelCase)",
        "пропущена запятая между None и 24",
        "true → True",
        "score =+ 1 — это присваивание +1; нужно +=",
        "Fill → fill",
        "\"Score:\" + score — нельзя складывать строку и число; нужно str(score)",
        "пропущена запятая между score и True в render",
        "пропущена запятая между 10 и 10 в blit",
        "pygame.quit без () — не вызван",
        "стиль: цвета и шрифт в константы"
      ]
    },
    {
      title: "Гравитация и прыжок",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\ny = 250; vy = 0\ngravity = 0.5\nground = 250\nclock = pygame.time.Clock()\nwhile True:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: pygame.quit(); exit()\n        if e.type == pygame.KEYDOWN and e.key = pygame.K_SPACE:\n            vy = -10\n    vy = vy + gravity\n    y =+ vy\n    if y > ground\n        y = ground\n        vy = 0\n    screen.fill((0,0,0))\n    pygame.draw.rect(screen, (255,0,0), (180, y, 40, 40))\n    pygame.display.flip\n    clock.Tick(60)",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\ny = 250; vy = 0\ngravity = 0.5\nground = 250\nclock = pygame.time.Clock()\nwhile True:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: pygame.quit(); exit()\n        if e.type == pygame.KEYDOWN and e.key == pygame.K_SPACE:\n            vy = -10\n    vy = vy + gravity\n    y += vy\n    if y > ground:\n        y = ground\n        vy = 0\n    screen.fill((0, 0, 0))\n    pygame.draw.rect(screen, (255, 0, 0), (180, int(y), 40, 40))\n    pygame.display.flip()\n    clock.tick(60)",
      errors: [
        "e.key = pygame.K_SPACE — = это присваивание; нужно ==",
        "y =+ vy — это присваивание +vy; нужно y += vy",
        "после if y > ground пропущено двоеточие :",
        "y — дробное число, в Rect лучше int(y) для отрисовки",
        "pygame.display.flip без () — не вызван",
        "Tick → tick",
        "прыжок возможен в воздухе — нужно проверять on_ground (логика)",
        "стиль: gravity, jump_speed в константы",
        "ground фиксирован — лучше площадка-объект (расширение)",
        "при vy >> ground может проскочить — стиль/логика"
      ]
    },
    {
      title: "Меню Старт/Выход",
      broken: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nfont = pygame.font.SysFont(None, 36)\nstate = \"menu\"\nwhile True:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: pygame.quit(); exit()\n        if e.type == pygame.KEYDOWN:\n            if e.key == pygame.K_RETURN\n                state = \"play\"\n            if e.key == pygame.K_ESCAPE:\n                state = menu\n    screen.fill((0,0,0))\n    if state = \"menu\":\n        t = font.render(\"ENTER — играть, ESC — меню\", True, (255,255,255))\n        screen.Blit(t, (20, 130))\n    elif state == \"play\"\n        t = font.render(\"Игра идёт!\" True, (0,255,0))\n        screen.blit(t (120, 130))\n    pygame.display.Flip()",
      fixed: "import pygame\npygame.init()\nscreen = pygame.display.set_mode((400, 300))\nfont = pygame.font.SysFont(None, 36)\nstate = \"menu\"\nwhile True:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: pygame.quit(); exit()\n        if e.type == pygame.KEYDOWN:\n            if e.key == pygame.K_RETURN:\n                state = \"play\"\n            if e.key == pygame.K_ESCAPE:\n                state = \"menu\"\n    screen.fill((0, 0, 0))\n    if state == \"menu\":\n        t = font.render(\"ENTER — играть, ESC — меню\", True, (255, 255, 255))\n        screen.blit(t, (20, 130))\n    elif state == \"play\":\n        t = font.render(\"Игра идёт!\", True, (0, 255, 0))\n        screen.blit(t, (120, 130))\n    pygame.display.flip()",
      errors: [
        "после if e.key == pygame.K_RETURN пропущено двоеточие :",
        "state = menu — menu это переменная; нужно строка \"menu\"",
        "if state = \"menu\" — присваивание; нужно ==",
        "screen.Blit → screen.blit",
        "после elif state == \"play\" пропущено двоеточие :",
        "пропущена запятая между \"Игра идёт!\" и True",
        "пропущена запятая между t и (120, 130) во втором blit",
        "Flip → flip",
        "стиль: состояния игры в Enum или константы",
        "стиль: отрисовка меню/игры в отдельные функции"
      ]
    },
    {
      title: "Игра «Поймай яблоко» (полный мини-цикл)",
      broken: "import pygame, random\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nclock = pygame.time.Clock()\nscore = 0\nbasket = pygame.Rect(180, 360, 40, 20)\napple = pygame.Rect(random.randint(0, 360), 0, 20, 20)\nfont = pygame.font.SysFont(None, 28)\nrunning = true\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = false\n    keys = pygame.key.get_pressed()\n    if keys[pygame.K_LEFT]:  basket.x =- 5\n    if keys[pygame.K_RIGHT]: basket.x =+ 5\n    apple.y += 4\n    if apple.colliderect(basket)\n        score = score + 1\n        apple.x = random.randint(0, 360)\n        apple.y = 0\n    if apple.y > 400:\n        apple.x = random.randint(0, 360)\n        apple.y = 0\n    screen.fill((0,0,0))\n    pygame.draw.rect(screen, (255,0,0) apple)\n    pygame.draw.rect(screen (0,255,0), basket)\n    t = font.render(\"Score: \" + score, True (255,255,255))\n    screen.blit(t (10, 10))\n    pygame.display.Flip()\n    clock.tick(60)\npygame.quit",
      fixed: "import pygame, random\npygame.init()\nscreen = pygame.display.set_mode((400, 400))\nclock = pygame.time.Clock()\nscore = 0\nbasket = pygame.Rect(180, 360, 40, 20)\napple = pygame.Rect(random.randint(0, 360), 0, 20, 20)\nfont = pygame.font.SysFont(None, 28)\nrunning = True\nwhile running:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: running = False\n    keys = pygame.key.get_pressed()\n    if keys[pygame.K_LEFT]:  basket.x -= 5\n    if keys[pygame.K_RIGHT]: basket.x += 5\n    apple.y += 4\n    if apple.colliderect(basket):\n        score += 1\n        apple.x = random.randint(0, 360)\n        apple.y = 0\n    if apple.y > 400:\n        apple.x = random.randint(0, 360)\n        apple.y = 0\n    screen.fill((0, 0, 0))\n    pygame.draw.rect(screen, (255, 0, 0), apple)\n    pygame.draw.rect(screen, (0, 255, 0), basket)\n    t = font.render(\"Score: \" + str(score), True, (255, 255, 255))\n    screen.blit(t, (10, 10))\n    pygame.display.flip()\n    clock.tick(60)\npygame.quit()",
      errors: [
        "true → True",
        "false → False",
        "basket.x =- 5 — это присваивание -5; нужно -=",
        "basket.x =+ 5 — это присваивание +5; нужно +=",
        "после if apple.colliderect(basket) пропущено двоеточие :",
        "пропущена запятая между (255,0,0) и apple",
        "пропущена запятая между screen и (0,255,0) во втором draw.rect",
        "\"Score: \" + score — нужно str(score)",
        "пропущена запятая между True и (255,255,255) в render",
        "пропущена запятая между t и (10, 10) в blit",
        "Flip → flip",
        "pygame.quit без () — не вызван"
      ]
    },
  ];

  const result = [];
  tkBugs.forEach((b, i) => {
    const idx = i + 1;
    result.push({
      id: `tk${idx}`,
      title: `Tkinter #${idx} — ${b.title}`,
      level: idx<=5?"Новичок":idx<=10?"Средний":"Продвинутый",
      oop: false,
      kind: "tkinter",
      broken: b.broken, fixed: b.fixed, errors: b.errors
    });
  });
  pgBugs.forEach((b, i) => {
    const idx = i + 1;
    result.push({
      id: `pg${idx}`,
      title: `Pygame #${idx} — ${b.title}`,
      level: idx<=5?"Новичок":idx<=10?"Средний":"Продвинутый",
      oop: true,
      kind: "pygame",
      broken: b.broken, fixed: b.fixed, errors: b.errors
    });
  });
  return result;
}

// AI Challenge tasks aligned to Tkinter & Pygame course topics.
// Каждая задача связана с конкретной темой курса. Используй AI-чат
// (ChatGPT, Claude, Lovable AI и т.д.) как помощника: генерируй код,
// ищи ошибки, объясняй концепции — и обязательно запускай результат сам.
const AI_TASKS = [
  // ───────────────── 🪟 TKINTER — Новичок ─────────────────
  {id:"ai1", title:"#1. 🪟 Tkinter: Первое окно", desc:"Попроси AI написать программу на Tkinter, которая создаёт окно 400×300 с заголовком «Моё первое окно» и одной надписью Label по центру. Запусти у себя.", hint:"Промт: «Напиши минимальный Tkinter-код: Tk(), title, geometry('400x300'), Label, mainloop(). Объясни каждую строку».", level:"easy"},
  {id:"ai2", title:"#2. 🪟 Tkinter: Кнопка и Label", desc:"Сделай окно с кнопкой «Привет». При нажатии Label показывает «Привет, мир!». Попроси AI объяснить роль command= у кнопки.", hint:"Промт: «Tkinter: кнопка меняет текст Label через config(text=...). Покажи код и объясни command».", level:"easy"},
  {id:"ai3", title:"#3. 🪟 Tkinter: Ввод имени", desc:"Окно: Entry + кнопка «OK» + Label. После нажатия Label выводит «Привет, <имя>!». Попроси AI показать .get() у Entry.", hint:"Промт: «Tkinter Entry.get(), Label.config(text=...). Полный пример с приветствием по имени».", level:"easy"},
  {id:"ai4", title:"#4. 🐞 Tkinter Debug: окно не появляется", desc:"Дай AI этот код и попроси найти ВСЕ ошибки:\n\nfrom tkinter import *\nroot = tk()\nroot.title = 'Привет'\nLabel(root, text='Hi')\nroot.mainloop\n\nИсправь и запусти.", hint:"Ошибок 4: tk() vs Tk(), title как метод, забыт .pack()/.grid(), mainloop без скобок.", level:"easy"},
  // ───────────────── 🪟 TKINTER — Средний ─────────────────
  {id:"ai5", title:"#5. 🪟 Tkinter: pack vs grid vs place", desc:"Попроси AI собрать ОДНО окно тремя способами: pack, grid, place — с тремя кнопками. Сравни код и объясни, когда какой менеджер удобнее.", hint:"Промт: «Tkinter: один и тот же макет из 3 кнопок через pack, grid, place. Объясни плюсы и минусы».", level:"mid"},
  {id:"ai6", title:"#6. 🪟 Tkinter: Калькулятор +/−", desc:"Два Entry для чисел, кнопки «+» и «−», Label с результатом. Обработай ввод не-числа (try/except → messagebox). Попроси AI добавить проверку.", hint:"Промт: «Простой Tkinter-калькулятор на сложение/вычитание с messagebox.showerror при неверном вводе».", level:"mid"},
  {id:"ai7", title:"#7. 🪟 Tkinter: События и bind", desc:"Окно с Canvas. По клику мыши (<Button-1>) рисуется кружок в точке клика. По нажатию <space> экран очищается. Попроси AI объяснить event.x / event.y.", hint:"Промт: «Tkinter: canvas.bind('<Button-1>', ...), root.bind('<space>', ...), create_oval, delete('all')».", level:"mid"},
  {id:"ai8", title:"#8. 🪟 Tkinter: Список дел (To-Do)", desc:"Entry + кнопка «Добавить» + Listbox + кнопка «Удалить выбранное». Попроси AI показать Listbox.insert / Listbox.delete / curselection.", hint:"Промт: «Tkinter To-Do приложение: Entry, Listbox, добавление и удаление элементов».", level:"mid"},
  {id:"ai9", title:"#9. 🐞 Tkinter Debug: grid не работает", desc:"Найди ошибки:\n\nimport tkinter as tk\nroot = tk.Tk()\nb1 = tk.Button(root, text='A')\nb2 = tk.Button(root, text='B')\nb1.pack()\nb2.grid(row=0, column=0)\nroot.mainloop()\n\nПочему программа зависает? Исправь.", hint:"Нельзя смешивать pack и grid в одном контейнере — это причина зависания/ошибки.", level:"mid"},
  // ───────────────── 🪟 TKINTER — Продвинутый ─────────────────
  {id:"ai10", title:"#10. 🪟 Tkinter: Canvas-рисовалка", desc:"Программа Paint: рисование линией по движению мыши (<B1-Motion>), выбор цвета через colorchooser, кнопка «Очистить». Попроси AI собрать каркас.", hint:"Промт: «Tkinter Canvas paint: <B1-Motion>, create_line с lastx/lasty, tkinter.colorchooser.askcolor».", level:"hard"},
  {id:"ai11", title:"#11. 🪟 Tkinter: Мини-форма с валидацией", desc:"Форма «Регистрация»: имя, email, возраст. По нажатию «Сохранить» — валидация (email содержит @, возраст 1..120) и messagebox. Сохрани данные в JSON-файл.", hint:"Промт: «Tkinter форма с валидацией и сохранением в users.json через json.dump».", level:"hard"},

  // ───────────────── 🎮 PYGAME — Новичок ─────────────────
  {id:"ai12", title:"#12. 🎮 Pygame: Пустое окно", desc:"Попроси AI написать минимальную Pygame-программу: окно 800×600, заголовок «My Game», цвет фона светло-синий, корректный выход по крестику.", hint:"Промт: «Минимальный pygame: init, set_mode((800,600)), set_caption, game loop с QUIT, fill, flip, quit». Объясни каждую строку.", level:"easy"},
  {id:"ai13", title:"#13. 🎮 Pygame: Игровой цикл и FPS", desc:"Добавь в окно Clock и ограничь FPS до 60. Выведи в заголовок окна текущий FPS. Попроси AI объяснить, зачем нужен tick().", hint:"Промт: «pygame.time.Clock, clock.tick(60), clock.get_fps(), set_caption. Объясни зачем».", level:"easy"},
  {id:"ai14", title:"#14. 🎮 Pygame: Прямоугольник от клавиш", desc:"Нарисуй красный прямоугольник. Двигай его стрелками (KEYDOWN или pygame.key.get_pressed). Попроси AI показать оба способа и сравнить.", hint:"Промт: «pygame: движение прямоугольника стрелками через get_pressed, скорость 5 px/кадр».", level:"easy"},
  {id:"ai15", title:"#15. 🐞 Pygame Debug: окно мгновенно закрывается", desc:"Найди ошибки:\n\nimport pygame\npygame.init()\nscreen = pygame.display.set_mode(800, 600)\nrunning = True\nwhile running:\n    for event in pygame.event.get:\n        if event.type == pygame.QUIT:\n            running = False\n    screen.fill((0,0,0))\npygame.quit()\n\nПочему окно белое/виснет и закрывается? Исправь.", hint:"Ошибки: set_mode((800,600)) — кортеж; event.get() — со скобками; нет display.flip()/update().", level:"easy"},
  // ───────────────── 🎮 PYGAME — Средний ─────────────────
  {id:"ai16", title:"#16. 🎮 Pygame: Мышь и клик", desc:"При клике мыши в окне рисуется кружок в точке клика. По правому клику — все кружки очищаются. Попроси AI показать MOUSEBUTTONDOWN и event.pos.", hint:"Промт: «pygame: рисование кружков по клику мыши, очистка по правой кнопке, список точек».", level:"mid"},
  {id:"ai17", title:"#17. 🎮 Pygame: Коллизия двух прямоугольников", desc:"Игрок-квадрат двигается стрелками. На экране — статичный «враг»-квадрат. При столкновении (Rect.colliderect) экран краснеет. Попроси AI объяснить colliderect.", hint:"Промт: «pygame: Rect.colliderect, смена цвета фона при столкновении игрока и врага».", level:"mid"},
  {id:"ai18", title:"#18. 🎮 Pygame: Спрайт и анимация", desc:"Используй класс Sprite и Group. Спрайт игрока — картинка (или цветной Surface). Добавь простую анимацию: смена кадра каждые 10 тиков.", hint:"Промт: «pygame.sprite.Sprite с update(), список image-кадров, переключение по счётчику».", level:"mid"},
  {id:"ai19", title:"#19. 🎮 Pygame: Счёт и текст", desc:"Игрок собирает «монетки» (рандомные кружки). За каждый сбор +1 к счёту. Счёт рисуется через pygame.font.Font в углу экрана.", hint:"Промт: «pygame: счётчик очков, font.render, blit, респаун монеток через random».", level:"mid"},
  {id:"ai20", title:"#20. 🐞 Pygame Debug: игрок не двигается", desc:"Найди и исправь ошибки:\n\nimport pygame\npygame.init()\nscreen = pygame.display.set_mode((600,400))\nx, y = 100, 100\nwhile True:\n    for e in pygame.event.get():\n        if e.type == pygame.QUIT: pygame.quit()\n    keys = pygame.key.get_pressed\n    if keys[pygame.K_RIGHT]: x + 5\n    pygame.draw.rect(screen,(255,0,0),(x,y,40,40))\n    pygame.display.flip()", hint:"Ошибки: get_pressed без (), x + 5 не присваивает (надо x += 5), нет screen.fill для очистки, нет exit/break после quit.", level:"mid"},
  // ───────────────── 🎮 PYGAME — Продвинутый ─────────────────
  {id:"ai21", title:"#21. 🎮 Pygame: Понг (Pong)", desc:"Собери классику: 2 ракетки (стрелки и W/S), мяч с отскоком от стен и ракеток, счёт сверху. Используй Sprite-группы и Rect-коллизии.", hint:"Промт: «Полный pygame-Pong: классы Paddle, Ball, столкновения, счёт, перезапуск мяча после гола».", level:"hard"},
  {id:"ai22", title:"#22. 🎮 Pygame: Сборщик астероидов", desc:"Игрок-корабль двигается стрелками. Сверху падают астероиды (спрайты со случайной x и скоростью). Столкновение — Game Over, экран с финальным счётом и кнопкой «Restart» (по клавише R).", hint:"Промт: «pygame arcade game: Player, Asteroid(Sprite), Group, spritecollide, состояние PLAY/GAMEOVER, restart по R».", level:"hard"},
  {id:"ai23", title:"#23. 🎮 Pygame: Платформер-прыжок", desc:"Игрок на «земле», прыжок по пробелу с гравитацией (vy += gravity). Один статичный платформ-Rect. Приземление останавливает падение. Попроси AI показать гравитацию.", hint:"Промт: «pygame: гравитация vy += 0.5, прыжок vy=-10, проверка касания пола через colliderect».", level:"hard"},

  // ───────────────── 🔀 Смешанные финальные ─────────────────
  {id:"ai24", title:"#24. 🧩 Сравни: Tkinter vs Pygame", desc:"Попроси AI сделать ОДНУ задачу — «движущийся квадрат по стрелкам» — двумя способами: на Tkinter (Canvas + bind) и на Pygame (loop + key.get_pressed). Сравни код и поведение.", hint:"Промт: «Реализуй движение квадрата стрелками на Tkinter и на Pygame. Сравни производительность и стиль кода».", level:"hard"},
  {id:"ai25", title:"#25. 🏆 Финальный проект: игра + меню", desc:"Сделай связку: окно меню на Tkinter (кнопки «Играть», «Правила», «Выход»). По «Играть» запускается Pygame-игра из задачи #22. Попроси AI помочь с subprocess или os.system для запуска Pygame-файла.", hint:"Промт: «Tkinter главное меню запускает pygame-игру через subprocess.Popen(['python','game.py'])».", level:"hard"}
];


const ACHIEVEMENTS = [
  {id:"first", name:"🎉 Первые шаги", desc:"Открой первую тему"},
  {id:"five", name:"🔥 На разогреве", desc:"Изучи 5 тем"},
  {id:"half", name:"🏅 Половина пути", desc:"Изучи 20 тем"},
  {id:"all", name:"👑 Мастер Python", desc:"Изучи все 40 тем"},
  {id:"quiz", name:"🧠 Эрудит", desc:"Пройди первый квиз"},
  {id:"quiz5", name:"🎓 Квиз-мастер", desc:"Пройди 5 викторин"},
  {id:"debug1", name:"🐛 Охотник за багами", desc:"Реши первый debug"},
  {id:"debug10", name:"🛠️ Инженер", desc:"Реши 10 debug-программ"},
  {id:"xp100", name:"⭐ 100 XP", desc:"Заработай 100 XP"},
  {id:"xp500", name:"🌟 500 XP", desc:"Заработай 500 XP"},
  {id:"xp1000", name:"💎 1000 XP", desc:"Заработай 1000 XP"}
];

const STATE_KEY = "pyacademy_state_v1";
const state = loadState();
function loadState(){
  try { return JSON.parse(localStorage.getItem(STATE_KEY)) || initState(); }
  catch { return initState(); }
}
function initState(){ return {xp:0, done:{}, quizDone:{}, debugDone:{}, aiDone:{}, achievements:{}, theme:"light", profile:null}; }
function saveState(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }

// Real-time profile refresh bus — other modules register via window.PA_onStateChange
function notifyStateChange(){
  try{ if (typeof window.PA_refreshProfile === 'function') window.PA_refreshProfile(); }catch(e){}
}

function addXP(n){
  state.xp += n;
  if (state.xp >= 100) unlock("xp100");
  if (state.xp >= 500) unlock("xp500");
  if (state.xp >= 1000) unlock("xp1000");
  saveState(); renderTop(); notifyStateChange();
}
function markDone(id){ state.done[id] = true; saveState(); renderTop(); renderSidebar(); notifyStateChange(); }
function unlock(id){
  if (state.achievements[id]) return;
  state.achievements[id] = true; saveState();
  toast(`🏆 Достижение: ${ACHIEVEMENTS.find(a=>a.id===id)?.name||id}`);
  notifyStateChange();
}

const KEYWORDS = /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|self)\b/g;
const BUILTINS = /\b(print|len|range|int|str|float|bool|list|dict|set|tuple|input|open|map|filter|reduce|sorted|sum|min|max|abs|round|type|isinstance|enumerate|zip|any|all)\b/g;
function highlight(code){
  return code
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(KEYWORDS,'<span class="tok-key">$1</span>')
    .replace(BUILTINS,'<span class="tok-fn">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g,'<span class="tok-num">$1</span>');
}

let currentView = {type:"home"};
let searchQuery = "";
let levelFilter = "all";

function $(sel){ return document.querySelector(sel); }
function el(tag, props={}, ...children){
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k,v])=>{
    if (k==="class") e.className = v;
    else if (k==="html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.flat().forEach(c => e.appendChild(typeof c==="string" ? document.createTextNode(c) : c));
  return e;
}

function toast(msg){
  const t = el("div", {class:"toast"}, msg);
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2800);
}

function renderTop(){
  const total = TOPICS.length;
  const doneCount = Object.keys(state.done).filter(k=>k.startsWith("t")).length;
  const pct = Math.round((doneCount/total)*100);
  const bar = $("#progress-bar"); if (bar) bar.style.width = pct + "%";
  const xp = $("#xp-val"); if (xp) xp.textContent = state.xp;
  const pctEl = $("#pct"); if (pctEl) pctEl.textContent = pct + "%";
}

function renderSidebar(){
  const groups = {};
  TOPICS.filter(t=>{
    if (levelFilter!=="all" && t.level!==levelFilter) return false;
    if (searchQuery && !(t.title.toLowerCase().includes(searchQuery)||t.intro.toLowerCase().includes(searchQuery))) return false;
    return true;
  }).forEach(t=>{
    groups[t.group] = groups[t.group] || [];
    groups[t.group].push(t);
  });
  const container = $("#nav-list");
  container.innerHTML = "";
  const home = el("div", {class:"nav-item"+(currentView.type==="home"?" active":""), onclick:()=>navigate({type:"home"})},
    el("div",{class:"nav-icon"},"🏠"), el("span",{},"Главная"));
  const debugItem = el("div", {class:"nav-item"+(currentView.type==="debug"?" active":""), onclick:()=>navigate({type:"debug"})},
    el("div",{class:"nav-icon"},"🐛"), el("span",{},"Debug Challenge"));
  const aiItem = el("div", {class:"nav-item"+(currentView.type==="ai"?" active":""), onclick:()=>navigate({type:"ai"})},
    el("div",{class:"nav-icon"},"🤖"), el("span",{},"AI Challenge"));
  const achItem = el("div", {class:"nav-item"+(currentView.type==="ach"?" active":""), onclick:()=>navigate({type:"ach"})},
    el("div",{class:"nav-icon"},"🏆"), el("span",{},"Достижения"));
  container.append(home, debugItem, aiItem, achItem);
  Object.entries(groups).forEach(([g, items])=>{
    container.appendChild(el("div",{class:"nav-section"}, g));
    items.forEach(t=>{
      const item = el("div", {
        class:"nav-item"+(currentView.type==="topic"&&currentView.id===t.id?" active":"")+(state.done["t"+t.id]?" done":""),
        onclick:()=>navigate({type:"topic", id:t.id})
      }, el("div",{class:"nav-icon"}, t.emoji), el("span",{}, t.title));
      container.appendChild(item);
    });
  });
}

function navigate(v){ currentView = v; render(); }

function render(){
  renderSidebar(); renderTop();
  const main = $("#main");
  main.innerHTML = "";
  main.classList.remove("fade-in"); void main.offsetWidth; main.classList.add("fade-in");
  if (currentView.type==="home") renderHome(main);
  else if (currentView.type==="topic") renderTopic(main, TOPICS.find(t=>t.id===currentView.id));
  else if (currentView.type==="debug") renderDebug(main);
  else if (currentView.type==="ai") renderAI(main);
  else if (currentView.type==="ach") renderAch(main);
}

function renderHome(main){
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🐍"),
      el("h1",{},"Добро пожаловать в Python Academy!"),
      el("p",{},"Интерактивная платформа для изучения Python. 40 тем, 600+ примеров, 30 debug-задач, AI-челлендж, викторины и достижения. Учись, играй, набирай XP!")
    )
  );
  const cards = el("div",{class:"cards"});
  TOPICS.forEach(t=>{
    const c = el("div",{class:"card"+(state.done["t"+t.id]?" done":""), onclick:()=>navigate({type:"topic",id:t.id})},
      el("div",{class:"emoji"}, t.emoji),
      el("h3",{}, t.title),
      el("div",{class:"meta"}, `${t.group} · `, el("span",{class:"level-"+(t.level==="easy"?"easy":t.level==="mid"?"mid":"hard")}, t.level==="easy"?"новичок":t.level==="mid"?"средний":"продвинутый"))
    );
    cards.appendChild(c);
  });
  if (state.profile){
    main.append(el("div",{class:"panel",style:"margin:18px 40px"},
      el("h3",{},"👤 Профиль ученика"),
      el("p",{}, "Имя: " + state.profile.fullName),
      el("p",{}, "Класс: " + state.profile.className),
      el("p",{class:"muted"}, "XP: " + state.xp + " · Изучено тем: " + Object.keys(state.done).filter(k=>k.startsWith("t")).length + "/" + TOPICS.length)
    ));
  }
  main.append(el("h2",{},"📚 Темы курса"), cards);
}

function renderTopic(main, topic){
  if (!topic) return;
  unlock("first");
  const doneCount = Object.keys(state.done).filter(k=>k.startsWith("t")).length;
  if (doneCount >= 5) unlock("five");
  if (doneCount >= 20) unlock("half");
  if (doneCount >= 40) unlock("all");

  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"}, topic.emoji),
      el("h1",{}, topic.title),
      el("p",{}, `Группа: ${topic.group} · Уровень: ${topic.level==="easy"?"новичок":topic.level==="mid"?"средний":"продвинутый"}`)
    )
  );
  const tabs = el("div",{class:"tabs"});
  const tabNames = [["intro","📖 Объяснение"],["examples","💻 Примеры (15)"],["tasks","✏️ Задания"],["quiz","🧠 Викторина"]];
  const contents = {};
  tabNames.forEach(([key,label])=>{
    const t = el("div",{class:"tab"+(key==="intro"?" active":""), onclick:()=>{
      tabs.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      Object.values(contents).forEach(c=>c.style.display="none");
      contents[key].style.display="block";
    }}, label);
    tabs.appendChild(t);
  });
  main.appendChild(tabs);
  const wrap = el("div",{}); main.appendChild(wrap);

  contents.intro = el("div",{},
    el("div",{class:"panel"},
      el("h3",{},"Простое объяснение"),
      el("p",{}, topic.intro),
      el("h3",{},"Синтаксис"),
      codeBlock(topic.syntax),
      el("p",{class:"muted"}, "💡 " + topic.syntaxNote),
      el("button",{class:"btn-primary", onclick:()=>{
        if (!state.done["t"+topic.id]) addXP(20);
        markDone("t"+topic.id);
        toast("✅ Тема отмечена как изученная (+20 XP)");
      }},"Отметить как изученную")
    )
  );

  const examples = makeExamples(topic);
  contents.examples = el("div",{});
  examples.forEach((ex,i)=>{
    const out = el("div",{class:"run-out"}, "(нажмите «Показать вывод»)");
    const codeArea = el("textarea",{class:"editor"});
    codeArea.value = ex.code;
    const ex_el = el("div",{class:"example"},
      el("h3",{}, `#${i+1}. ${ex.title} `, el("span",{class:"badge level-"+(ex.level==="Новичок"?"easy":ex.level==="Средний"?"mid":"hard")}, ex.level)),
      el("p",{class:"muted"}, ex.explanation),
      codeArea,
      el("div",{class:"code-actions"},
        el("button",{class:"btn-primary",onclick:()=>{out.textContent = "▶ Ожидаемый вывод:\n" + ex.output;}},"▶ Показать вывод"),
        el("button",{class:"btn-ghost",onclick:()=>{navigator.clipboard.writeText(codeArea.value);toast("📋 Скопировано!")}},"📋 Копировать"),
        el("button",{class:"btn-ghost",onclick:()=>{codeArea.value=ex.code;out.textContent="(нажмите «Показать вывод»)"}},"🔄 Сброс"),
        el("button",{class:"btn-accent",onclick:()=>{out.textContent="✅ Эталонный вывод:\n"+ex.output}},"👁 Решение")
      ),
      out,
      el("p",{class:"muted",style:"margin-top:8px;font-size:12px"}, "💡 Python запускается интерпретатором — сохрани файл .py и запусти: python file.py")
    );
    contents.examples.appendChild(ex_el);
  });

  contents.tasks = el("div",{});
  makeTasks(topic).forEach((tk,i)=>{
    const sol = el("div",{class:"codebox",style:"display:none;margin-top:8px"}, el("pre",{html:highlight(tk.solution)}));
    const hint = el("p",{class:"muted",style:"display:none"}, "💡 " + tk.hint);
    contents.tasks.appendChild(
      el("div",{class:"panel"},
        el("h3",{}, `Задание ${i+1}`),
        el("p",{}, tk.q),
        el("div",{class:"code-actions"},
          el("button",{class:"btn-ghost",onclick:()=>hint.style.display=hint.style.display==="none"?"block":"none"},"💡 Подсказка"),
          el("button",{class:"btn-accent",onclick:()=>sol.style.display=sol.style.display==="none"?"block":"none"},"✅ Решение")
        ),
        hint, sol
      )
    );
  });

  const quiz = makeQuiz(topic);
  contents.quiz = el("div",{});
  let score = 0, answered = 0;
  const scoreEl = el("h3",{}, `Счёт: 0 / ${quiz.length}`);
  contents.quiz.appendChild(scoreEl);
  quiz.forEach((q,qi)=>{
    const opts = el("div",{class:"opts"});
    q.opts.forEach((opt,oi)=>{
      const o = el("div",{class:"opt", onclick:()=>{
        if (o.dataset.locked) return;
        opts.querySelectorAll(".opt").forEach(x=>x.dataset.locked="1");
        if (oi===q.answer){ o.classList.add("correct"); score++; }
        else { o.classList.add("wrong"); opts.children[q.answer].classList.add("correct"); }
        answered++;
        scoreEl.textContent = `Счёт: ${score} / ${quiz.length}`;
        if (answered===quiz.length){
          const isFirstCompletion = !state.quizDone["q"+topic.id];
          // Mark quizDone BEFORE calling addXP/notifyStateChange so the profile
          // card reads the updated quizDone count when it refreshes
          if (isFirstCompletion) {
            state.quizDone["q"+topic.id] = true;
            saveState();
            addXP(30); // internally calls notifyStateChange() -> profile updates with correct quizDone
            unlock("quiz");
            const quizCount = Object.keys(state.quizDone).length;
            if (quizCount >= 5) unlock("quiz5");
          } else {
            // Quiz already completed before — still refresh profile to stay in sync
            notifyStateChange();
          }
          toast(`Квиз пройден! ${score}/${quiz.length}`);
        }
      }}, opt);
      opts.appendChild(o);
    });
    contents.quiz.appendChild(el("div",{class:"quiz-q"}, el("strong",{},`${qi+1}. ${q.q}`), opts));
  });
  Object.entries(contents).forEach(([k,v])=>{ if (k!=="intro") v.style.display="none"; wrap.appendChild(v); });
}

function renderDebug(main){
  const bugs = window.__BUGS__ || (window.__BUGS__ = makeBugs());
  const doneN = Object.keys(state.debugDone).length;
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🐛"),
      el("h1",{},"Debug Challenge — Охота на ошибки"),
      el("p",{},`30 сломанных программ: 15 на Tkinter (GUI) + 15 на Pygame (игры). В каждой минимум 10 ошибок. Найди и исправь их! Решено: ${doneN}/30`)
    )
  );
  bugs.forEach(b=>{
    const editor = el("textarea",{class:"editor",style:"min-height:260px"});
    editor.value = b.broken;
    const errList = el("ol",{style:"display:none"});
    b.errors.forEach(e=>errList.appendChild(el("li",{},e)));
    const fixedBox = el("div",{class:"codebox",style:"display:none;margin-top:8px"}, el("pre",{html:highlight(b.fixed)}));
    main.appendChild(el("div",{class:"panel"},
      el("h3",{}, `${b.title} `, el("span",{class:"badge level-"+(b.level==="Новичок"?"easy":b.level==="Средний"?"mid":"hard")}, b.level), " ", el("span",{class:"badge"}, b.kind==="pygame"?"🎮 Pygame":"🪟 Tkinter"), " ", el("span",{class:"badge"}, `найди ${b.errors.length}+ ошибок`)),
      editor,
      el("div",{class:"code-actions"},
        el("button",{class:"btn-ghost",onclick:()=>{
          errList.style.display = errList.style.display==="none"?"block":"none";
        }},"💡 Подсказки (список ошибок)"),
        el("button",{class:"btn-accent",onclick:()=>{
          fixedBox.style.display = fixedBox.style.display==="none"?"block":"none";
        }},"✅ Показать решение"),
        el("button",{class:"btn-primary",onclick:()=>{
          if (!state.debugDone[b.id]) { addXP(50); state.debugDone[b.id]=true; saveState();
            const n = Object.keys(state.debugDone).length;
            unlock("debug1"); if (n>=10) unlock("debug10");
            toast(`🐛 Программа решена! +50 XP (${n}/30)`);
            render();
          }
        }},"✔ Отметить решённой"+(state.debugDone[b.id]?" ✓":""))
      ),
      el("p",{class:"muted",style:"margin-top:8px"}, "Подсказки (нажми кнопку выше):"),
      errList,
      fixedBox
    ));
  });
}

function renderAI(main){
  const doneN = Object.keys(state.aiDone||{}).length;
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🤖"),
      el("h1",{},"AI Challenge — Творческие задачи с искусственным интеллектом"),
      el("p",{},`${AI_TASKS.length} креативных задач: используй любой AI-чат (ChatGPT, Claude, Lovable AI и т.д.), чтобы их выполнить. Решено: ${doneN}/${AI_TASKS.length}`)
    )
  );
  AI_TASKS.forEach(t=>{
    const hint = el("p",{class:"muted",style:"display:none;margin-top:8px"}, "💡 " + t.hint);
    main.appendChild(el("div",{class:"panel"},
      el("h3",{}, t.title, " ",
        el("span",{class:"badge level-"+(t.level==="easy"?"easy":t.level==="mid"?"mid":"hard")}, t.level==="easy"?"новичок":t.level==="mid"?"средний":"продвинутый")
      ),
      el("p",{}, t.desc),
      el("div",{class:"code-actions"},
        el("button",{class:"btn-ghost",onclick:()=>hint.style.display=hint.style.display==="none"?"block":"none"},"💡 Подсказка / промт"),
        el("button",{class:"btn-primary",onclick:()=>{
          state.aiDone = state.aiDone || {};
          if (!state.aiDone[t.id]) { state.aiDone[t.id]=true; addXP(40); saveState();
            toast(`🤖 Задача выполнена! +40 XP`);
            render();
          }
        }},"✔ Отметить выполненной"+((state.aiDone||{})[t.id]?" ✓":""))
      ),
      hint
    ));
  });
}

function renderAch(main){
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🏆"),
      el("h1",{},"Достижения"),
      el("p",{},`Открыто: ${Object.keys(state.achievements).length} / ${ACHIEVEMENTS.length}`)
    )
  );
  const wrap = el("div",{class:"achievements"});
  ACHIEVEMENTS.forEach(a=>{
    wrap.appendChild(el("div",{class:"ach"+(state.achievements[a.id]?" unlocked":"")},
      el("div",{}, el("strong",{},a.name)),
      el("div",{class:"muted"}, a.desc)
    ));
  });
  main.appendChild(wrap);
}

function codeBlock(code){
  const box = el("div",{class:"codebox"},
    el("pre",{html: highlight(code)})
  );
  const btn = el("button",{class:"btn-ghost",style:"margin-top:8px",onclick:()=>{navigator.clipboard.writeText(code);toast("📋 Скопировано!");}},"📋 Копировать");
  return el("div",{}, box, btn);
}

window.addEventListener("DOMContentLoaded", ()=>{
  const _initTheme = state.theme || "light";
  document.documentElement.className = _initTheme === "light" ? "light" : "";
  document.documentElement.setAttribute("data-theme", _initTheme);
  $("#search").addEventListener("input", e=>{ searchQuery = e.target.value.toLowerCase(); renderSidebar(); });
  document.querySelectorAll(".chip").forEach(c=>{
    c.addEventListener("click", ()=>{
      document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
      c.classList.add("active"); levelFilter = c.dataset.level; renderSidebar();
    });
  });
  $("#theme-toggle").addEventListener("click", ()=>{
    state.theme = state.theme==="light" ? "dark":"light"; saveState();
    document.documentElement.className = state.theme==="light"?"light":"";
    document.documentElement.setAttribute("data-theme", state.theme);
  });
  $("#reset").addEventListener("click", ()=>{
    if (confirm("Сбросить весь прогресс?")) {
      localStorage.removeItem(STATE_KEY); location.reload();
    }
  });
  const _eb = document.getElementById("edit-profile");
  if (_eb) _eb.addEventListener("click", ()=>showProfileModal(true));
  if (!state.profile) showProfileModal(false); else updateProfileBadge();
  render();
});

function updateProfileBadge(){
  const b = document.getElementById("profile-badge");
  if (!b) return;
  if (state.profile) b.textContent = "👤 " + state.profile.fullName + " · " + state.profile.className;
  else b.textContent = "👤 Гость";
}
function showProfileModal(canCancel){
  const back = el("div",{class:"modal-back"});
  const nameI = el("input",{class:"search",style:"margin:8px 0",placeholder:"Имя и фамилия"});
  const classI = el("input",{class:"search",style:"margin:8px 0",placeholder:"Класс (например, 6А)"});
  if (state.profile){ nameI.value = state.profile.fullName||""; classI.value = state.profile.className||""; }
  const err = el("div",{class:"muted",style:"color:#e25;font-size:12px;min-height:16px"});
  const save = el("button",{class:"btn-primary",style:"margin-right:8px",onclick:()=>{
    const n = nameI.value.trim(), c = classI.value.trim();
    if (n.length<2 || c.length<1){ err.textContent="Заполни оба поля"; return; }
    state.profile = {fullName:n, className:c}; saveState();
    updateProfileBadge(); back.remove(); render();
  }},"Сохранить");
  const cancel = canCancel ? el("button",{class:"btn-ghost",onclick:()=>back.remove()},"Отмена") : document.createTextNode("");
  const box = el("div",{class:"modal"},
    el("h3",{},"👤 Профиль ученика"),
    el("p",{class:"muted"},"Введи имя и класс — прогресс сохранится вместе с профилем."),
    nameI, classI, err,
    el("div",{style:"margin-top:8px"}, save, cancel)
  );
  back.appendChild(box);
  document.body.appendChild(back);
  setTimeout(()=>nameI.focus(),50);
}
