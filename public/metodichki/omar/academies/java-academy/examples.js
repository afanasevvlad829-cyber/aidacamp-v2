// Готовые к запуску Java-программы: 10 примеров на каждую тему
const TOPIC_EXAMPLES = {
  "1": [
    {
      "title": "Привет, мир",
      "code": "System.out.println(\"Привет, мир!\");",
      "output": "Привет, мир!",
      "explanation": "Готовый к запуску пример: Привет, мир."
    },
    {
      "title": "Печать числа",
      "code": "System.out.println(42);",
      "output": "42",
      "explanation": "Готовый к запуску пример: Печать числа."
    },
    {
      "title": "Несколько строк",
      "code": "System.out.println(\"Раз\");\nSystem.out.println(\"Два\");\nSystem.out.println(\"Три\");",
      "output": "Раз\nДва\nТри",
      "explanation": "Готовый к запуску пример: Несколько строк."
    },
    {
      "title": "print без перевода строки",
      "code": "System.out.print(\"AB\");\nSystem.out.print(\"CD\");",
      "output": "ABCD",
      "explanation": "Готовый к запуску пример: print без перевода строки."
    },
    {
      "title": "Сложение чисел в println",
      "code": "System.out.println(2 + 3);",
      "output": "5",
      "explanation": "Готовый к запуску пример: Сложение чисел в println."
    },
    {
      "title": "Конкатенация имени",
      "code": "String name = \"Аня\";\nSystem.out.println(\"Привет, \" + name + \"!\");",
      "output": "Привет, Аня!",
      "explanation": "Готовый к запуску пример: Конкатенация имени."
    },
    {
      "title": "printf форматирование",
      "code": "System.out.printf(\"%d + %d = %d%n\", 2, 3, 5);",
      "output": "2 + 3 = 5",
      "explanation": "Готовый к запуску пример: printf форматирование."
    },
    {
      "title": "Многострочный текст через \\n",
      "code": "System.out.println(\"Строка 1\\nСтрока 2\");",
      "output": "Строка 1\nСтрока 2",
      "explanation": "Готовый к запуску пример: Многострочный текст через \\n."
    },
    {
      "title": "Возраст и год",
      "code": "int age = 14, year = 2011;\nSystem.out.println(age + \", \" + year);",
      "output": "14, 2011",
      "explanation": "Готовый к запуску пример: Возраст и год."
    },
    {
      "title": "ASCII-ёлочка",
      "code": "System.out.println(\"  *\");\nSystem.out.println(\" ***\");\nSystem.out.println(\"*****\");",
      "output": "  *\n ***\n*****",
      "explanation": "Готовый к запуску пример: ASCII-ёлочка."
    }
  ],
  "2": [
    {
      "title": "Версия Java в коде",
      "code": "System.out.println(\"Java: \" + System.getProperty(\"java.version\"));",
      "output": "Java: 21 (или ваша версия)",
      "explanation": "Готовый к запуску пример: Версия Java в коде."
    },
    {
      "title": "Имя ОС",
      "code": "System.out.println(System.getProperty(\"os.name\"));",
      "output": "Windows 11 / Linux / Mac OS X",
      "explanation": "Готовый к запуску пример: Имя ОС."
    },
    {
      "title": "Имя пользователя",
      "code": "System.out.println(\"User: \" + System.getProperty(\"user.name\"));",
      "output": "User: ваше имя",
      "explanation": "Готовый к запуску пример: Имя пользователя."
    },
    {
      "title": "Аргументы командной строки",
      "code": "for (String a : args) System.out.println(a);",
      "output": "(то, что передали через java Main arg1 arg2)",
      "explanation": "Готовый к запуску пример: Аргументы командной строки."
    },
    {
      "title": "Кол-во ядер CPU",
      "code": "System.out.println(Runtime.getRuntime().availableProcessors());",
      "output": "например, 8",
      "explanation": "Готовый к запуску пример: Кол-во ядер CPU."
    },
    {
      "title": "Свободная память JVM",
      "code": "long free = Runtime.getRuntime().freeMemory();\nSystem.out.println(\"Свободно байт: \" + free);",
      "output": "Свободно байт: 254000000 (примерно)",
      "explanation": "Готовый к запуску пример: Свободная память JVM."
    },
    {
      "title": "Запуск-завершение",
      "code": "System.out.println(\"Старт\");\nSystem.exit(0);\nSystem.out.println(\"Не выведется\");",
      "output": "Старт",
      "explanation": "Готовый к запуску пример: Запуск-завершение."
    },
    {
      "title": "Время работы JVM",
      "code": "long t = System.currentTimeMillis();\nSystem.out.println(\"ms: \" + t);",
      "output": "ms: 1700000000000",
      "explanation": "Готовый к запуску пример: Время работы JVM."
    },
    {
      "title": "nanoTime для замеров",
      "code": "long s = System.nanoTime();\nfor (int i = 0; i < 1000; i++);\nSystem.out.println(System.nanoTime() - s);",
      "output": "например, 12000",
      "explanation": "Готовый к запуску пример: nanoTime для замеров."
    },
    {
      "title": "Java home path",
      "code": "System.out.println(System.getProperty(\"java.home\"));",
      "output": "/usr/lib/jvm/java-21 (или иной путь)",
      "explanation": "Готовый к запуску пример: Java home path."
    }
  ],
  "3": [
    {
      "title": "int",
      "code": "int x = 5;\nSystem.out.println(x);",
      "output": "5",
      "explanation": "Готовый к запуску пример: int."
    },
    {
      "title": "double",
      "code": "double pi = 3.14;\nSystem.out.println(pi);",
      "output": "3.14",
      "explanation": "Готовый к запуску пример: double."
    },
    {
      "title": "char",
      "code": "char c = 'A';\nSystem.out.println(c);",
      "output": "A",
      "explanation": "Готовый к запуску пример: char."
    },
    {
      "title": "boolean",
      "code": "boolean ok = true;\nSystem.out.println(ok);",
      "output": "true",
      "explanation": "Готовый к запуску пример: boolean."
    },
    {
      "title": "final-константа",
      "code": "final int MAX = 100;\nSystem.out.println(MAX);",
      "output": "100",
      "explanation": "Готовый к запуску пример: final-константа."
    },
    {
      "title": "long литерал",
      "code": "long big = 10_000_000_000L;\nSystem.out.println(big);",
      "output": "10000000000",
      "explanation": "Готовый к запуску пример: long литерал."
    },
    {
      "title": "Авторасширение int → double",
      "code": "int a = 5;\ndouble d = a;\nSystem.out.println(d);",
      "output": "5.0",
      "explanation": "Готовый к запуску пример: Авторасширение int → double."
    },
    {
      "title": "Приведение double → int",
      "code": "double d = 3.7;\nint i = (int) d;\nSystem.out.println(i);",
      "output": "3",
      "explanation": "Готовый к запуску пример: Приведение double → int."
    },
    {
      "title": "Перестановка двух переменных",
      "code": "int a = 1, b = 2;\nint t = a; a = b; b = t;\nSystem.out.println(a + \" \" + b);",
      "output": "2 1",
      "explanation": "Готовый к запуску пример: Перестановка двух переменных."
    },
    {
      "title": "Переполнение int",
      "code": "System.out.println(Integer.MAX_VALUE + 1);",
      "output": "-2147483648",
      "explanation": "Готовый к запуску пример: Переполнение int."
    }
  ],
  "4": [
    {
      "title": "Длина строки",
      "code": "System.out.println(\"программирование\".length());",
      "output": "16",
      "explanation": "Готовый к запуску пример: Длина строки."
    },
    {
      "title": "В верхний регистр",
      "code": "System.out.println(\"java\".toUpperCase());",
      "output": "JAVA",
      "explanation": "Готовый к запуску пример: В верхний регистр."
    },
    {
      "title": "Равенство через equals",
      "code": "System.out.println(\"abc\".equals(\"abc\"));",
      "output": "true",
      "explanation": "Готовый к запуску пример: Равенство через equals."
    },
    {
      "title": "Символ по индексу",
      "code": "System.out.println(\"Hello\".charAt(0));",
      "output": "H",
      "explanation": "Готовый к запуску пример: Символ по индексу."
    },
    {
      "title": "Замена символов",
      "code": "System.out.println(\"banana\".replace('a','@'));",
      "output": "b@n@n@",
      "explanation": "Готовый к запуску пример: Замена символов."
    },
    {
      "title": "Подстрока",
      "code": "System.out.println(\"привет\".substring(0, 3));",
      "output": "при",
      "explanation": "Готовый к запуску пример: Подстрока."
    },
    {
      "title": "Содержит ли подстроку",
      "code": "System.out.println(\"добрый день\".contains(\"день\"));",
      "output": "true",
      "explanation": "Готовый к запуску пример: Содержит ли подстроку."
    },
    {
      "title": "Разбиение split",
      "code": "String[] p = \"яблоко,груша,слива\".split(\",\");\nSystem.out.println(p.length + \": \" + p[1]);",
      "output": "3: груша",
      "explanation": "Готовый к запуску пример: Разбиение split."
    },
    {
      "title": "String.format с двумя знаками",
      "code": "System.out.println(String.format(\"%.2f\", 3.14159));",
      "output": "3,14 (или 3.14 в EN-локали)",
      "explanation": "Готовый к запуску пример: String.format с двумя знаками."
    },
    {
      "title": "StringBuilder сборка",
      "code": "StringBuilder sb = new StringBuilder();\nfor (int i = 1; i <= 5; i++) sb.append(i);\nSystem.out.println(sb);",
      "output": "12345",
      "explanation": "Готовый к запуску пример: StringBuilder сборка."
    }
  ],
  "5": [
    {
      "title": "Сложение",
      "code": "System.out.println(12 + 5);",
      "output": "17",
      "explanation": "Готовый к запуску пример: Сложение."
    },
    {
      "title": "Остаток от деления",
      "code": "System.out.println(17 % 5);",
      "output": "2",
      "explanation": "Готовый к запуску пример: Остаток от деления."
    },
    {
      "title": "Инкремент",
      "code": "int i = 5; i++;\nSystem.out.println(i);",
      "output": "6",
      "explanation": "Готовый к запуску пример: Инкремент."
    },
    {
      "title": "Сравнение",
      "code": "System.out.println(10 > 7);",
      "output": "true",
      "explanation": "Готовый к запуску пример: Сравнение."
    },
    {
      "title": "Логическое И",
      "code": "System.out.println(true && false);",
      "output": "false",
      "explanation": "Готовый к запуску пример: Логическое И."
    },
    {
      "title": "Квадратный корень",
      "code": "System.out.println(Math.sqrt(81));",
      "output": "9.0",
      "explanation": "Готовый к запуску пример: Квадратный корень."
    },
    {
      "title": "Случайный кубик",
      "code": "int dice = (int)(Math.random() * 6) + 1;\nSystem.out.println(dice);",
      "output": "1..6",
      "explanation": "Готовый к запуску пример: Случайный кубик."
    },
    {
      "title": "Степень",
      "code": "System.out.println(Math.pow(2, 10));",
      "output": "1024.0",
      "explanation": "Готовый к запуску пример: Степень."
    },
    {
      "title": "Тернарный оператор",
      "code": "int x = 7;\nSystem.out.println(x % 2 == 0 ? \"чётное\" : \"нечётное\");",
      "output": "нечётное",
      "explanation": "Готовый к запуску пример: Тернарный оператор."
    },
    {
      "title": "Гипотенуза",
      "code": "System.out.println(Math.hypot(3, 4));",
      "output": "5.0",
      "explanation": "Готовый к запуску пример: Гипотенуза."
    }
  ],
  "6": [
    {
      "title": "Создание и печать",
      "code": "int[] a = {1,2,3,4,5};\nSystem.out.println(java.util.Arrays.toString(a));",
      "output": "[1, 2, 3, 4, 5]",
      "explanation": "Готовый к запуску пример: Создание и печать."
    },
    {
      "title": "Первый и последний",
      "code": "int[] a = {10,20,30,40};\nSystem.out.println(a[0] + \" \" + a[a.length-1]);",
      "output": "10 40",
      "explanation": "Готовый к запуску пример: Первый и последний."
    },
    {
      "title": "Длина",
      "code": "int[] a = {1,2,3};\nSystem.out.println(a.length);",
      "output": "3",
      "explanation": "Готовый к запуску пример: Длина."
    },
    {
      "title": "Цикл for",
      "code": "int[] a = {2,4,6};\nfor (int i = 0; i < a.length; i++) System.out.println(a[i]);",
      "output": "2\n4\n6",
      "explanation": "Готовый к запуску пример: Цикл for."
    },
    {
      "title": "Сумма for-each",
      "code": "int[] a = {1,2,3,4,5};\nint s = 0;\nfor (int x : a) s += x;\nSystem.out.println(s);",
      "output": "15",
      "explanation": "Готовый к запуску пример: Сумма for-each."
    },
    {
      "title": "Максимум",
      "code": "int[] a = {3,7,2,9,5};\nint m = a[0];\nfor (int x : a) if (x > m) m = x;\nSystem.out.println(m);",
      "output": "9",
      "explanation": "Готовый к запуску пример: Максимум."
    },
    {
      "title": "Среднее",
      "code": "int[] a = {2,4,6,8};\nint s = 0;\nfor (int x : a) s += x;\nSystem.out.println((double)s / a.length);",
      "output": "5.0",
      "explanation": "Готовый к запуску пример: Среднее."
    },
    {
      "title": "Реверс на месте",
      "code": "int[] a = {1,2,3,4,5};\nfor (int i=0,j=a.length-1; i<j; i++,j--){ int t=a[i]; a[i]=a[j]; a[j]=t; }\nSystem.out.println(java.util.Arrays.toString(a));",
      "output": "[5, 4, 3, 2, 1]",
      "explanation": "Готовый к запуску пример: Реверс на месте."
    },
    {
      "title": "Линейный поиск",
      "code": "int[] a = {10,20,30,40};\nint x = 30, idx = -1;\nfor (int i = 0; i < a.length; i++) if (a[i] == x) { idx = i; break; }\nSystem.out.println(idx);",
      "output": "2",
      "explanation": "Готовый к запуску пример: Линейный поиск."
    },
    {
      "title": "Сортировка пузырьком",
      "code": "int[] a = {5,2,4,1,3};\nfor (int i=0;i<a.length-1;i++)\n  for (int j=0;j<a.length-1-i;j++)\n    if (a[j]>a[j+1]){int t=a[j];a[j]=a[j+1];a[j+1]=t;}\nSystem.out.println(java.util.Arrays.toString(a));",
      "output": "[1, 2, 3, 4, 5]",
      "explanation": "Готовый к запуску пример: Сортировка пузырьком."
    }
  ],
  "7": [
    {
      "title": "Матрица 3x3",
      "code": "int[][] g = {{1,2,3},{4,5,6},{7,8,9}};\nSystem.out.println(g[1][2]);",
      "output": "6",
      "explanation": "Готовый к запуску пример: Матрица 3x3."
    },
    {
      "title": "Кол-во строк/столбцов",
      "code": "int[][] g = {{1,2,3},{4,5,6}};\nSystem.out.println(g.length + \"x\" + g[0].length);",
      "output": "2x3",
      "explanation": "Готовый к запуску пример: Кол-во строк/столбцов."
    },
    {
      "title": "Печать построчно",
      "code": "int[][] g = {{1,2},{3,4}};\nfor (int[] row : g){\n  for (int v : row) System.out.print(v + \" \");\n  System.out.println();\n}",
      "output": "1 2 \n3 4 ",
      "explanation": "Готовый к запуску пример: Печать построчно."
    },
    {
      "title": "Сумма матрицы",
      "code": "int[][] g = {{1,2},{3,4}};\nint s = 0;\nfor (int[] r : g) for (int v : r) s += v;\nSystem.out.println(s);",
      "output": "10",
      "explanation": "Готовый к запуску пример: Сумма матрицы."
    },
    {
      "title": "Транспонирование",
      "code": "int[][] m = {{1,2,3},{4,5,6}};\nint[][] t = new int[3][2];\nfor (int i=0;i<2;i++) for (int j=0;j<3;j++) t[j][i] = m[i][j];\nSystem.out.println(java.util.Arrays.deepToString(t));",
      "output": "[[1, 4], [2, 5], [3, 6]]",
      "explanation": "Готовый к запуску пример: Транспонирование."
    },
    {
      "title": "Главная диагональ",
      "code": "int[][] g = {{1,2,3},{4,5,6},{7,8,9}};\nfor (int i=0;i<g.length;i++) System.out.print(g[i][i]+\" \");",
      "output": "1 5 9 ",
      "explanation": "Готовый к запуску пример: Главная диагональ."
    },
    {
      "title": "Шахматная доска",
      "code": "char[][] b = new char[8][8];\nfor (int i=0;i<8;i++) for (int j=0;j<8;j++) b[i][j] = (i+j)%2==0?'.':'#';\nSystem.out.println(new String(b[0]));",
      "output": ".#.#.#.#",
      "explanation": "Готовый к запуску пример: Шахматная доска."
    },
    {
      "title": "Максимум в матрице",
      "code": "int[][] g = {{3,7,2},{9,1,4}};\nint m = g[0][0];\nfor (int[] r : g) for (int v : r) if (v > m) m = v;\nSystem.out.println(m);",
      "output": "9",
      "explanation": "Готовый к запуску пример: Максимум в матрице."
    },
    {
      "title": "Заполнение через new",
      "code": "int[][] z = new int[2][3];\nSystem.out.println(java.util.Arrays.deepToString(z));",
      "output": "[[0, 0, 0], [0, 0, 0]]",
      "explanation": "Готовый к запуску пример: Заполнение через new."
    },
    {
      "title": "Зубчатый (jagged) массив",
      "code": "int[][] j = new int[3][];\nj[0] = new int[]{1};\nj[1] = new int[]{1,2};\nj[2] = new int[]{1,2,3};\nfor (int[] r : j) System.out.println(java.util.Arrays.toString(r));",
      "output": "[1]\n[1, 2]\n[1, 2, 3]",
      "explanation": "Готовый к запуску пример: Зубчатый (jagged) массив."
    }
  ],
  "8": [
    {
      "title": "Создание и добавление",
      "code": "import java.util.ArrayList;\npublic class Main {\n  public static void main(String[] a){\n    ArrayList<String> list = new ArrayList<>();\n    list.add(\"яблоко\");\n    list.add(\"груша\");\n    System.out.println(list);\n  }\n}",
      "output": "[яблоко, груша]",
      "explanation": "Готовый к запуску пример: Создание и добавление."
    },
    {
      "title": "Получение по индексу",
      "code": "ArrayList<Integer> l = new ArrayList<>();\nl.add(10); l.add(20); l.add(30);\nSystem.out.println(l.get(1));",
      "output": "20",
      "explanation": "Готовый к запуску пример: Получение по индексу."
    },
    {
      "title": "Размер списка",
      "code": "ArrayList<String> l = new ArrayList<>();\nl.add(\"a\"); l.add(\"b\"); l.add(\"c\");\nSystem.out.println(l.size());",
      "output": "3",
      "explanation": "Готовый к запуску пример: Размер списка."
    },
    {
      "title": "Удаление по индексу",
      "code": "ArrayList<String> l = new ArrayList<>(List.of(\"a\",\"b\",\"c\"));\nl.remove(1);\nSystem.out.println(l);",
      "output": "[a, c]",
      "explanation": "Готовый к запуску пример: Удаление по индексу."
    },
    {
      "title": "Проверка contains",
      "code": "ArrayList<Integer> l = new ArrayList<>(List.of(1,2,3));\nSystem.out.println(l.contains(2));",
      "output": "true",
      "explanation": "Готовый к запуску пример: Проверка contains."
    },
    {
      "title": "Перебор for-each",
      "code": "ArrayList<String> l = new ArrayList<>(List.of(\"Аня\",\"Боря\"));\nfor (String s : l) System.out.println(s);",
      "output": "Аня\nБоря",
      "explanation": "Готовый к запуску пример: Перебор for-each."
    },
    {
      "title": "Замена set",
      "code": "ArrayList<Integer> l = new ArrayList<>(List.of(1,2,3));\nl.set(0, 99);\nSystem.out.println(l);",
      "output": "[99, 2, 3]",
      "explanation": "Готовый к запуску пример: Замена set."
    },
    {
      "title": "Очистка",
      "code": "ArrayList<Integer> l = new ArrayList<>(List.of(1,2,3));\nl.clear();\nSystem.out.println(l.isEmpty());",
      "output": "true",
      "explanation": "Готовый к запуску пример: Очистка."
    },
    {
      "title": "Сортировка списка",
      "code": "ArrayList<Integer> l = new ArrayList<>(List.of(3,1,2));\nCollections.sort(l);\nSystem.out.println(l);",
      "output": "[1, 2, 3]",
      "explanation": "Готовый к запуску пример: Сортировка списка."
    },
    {
      "title": "Из массива в список",
      "code": "Integer[] arr = {5,4,3};\nArrayList<Integer> l = new ArrayList<>(Arrays.asList(arr));\nSystem.out.println(l);",
      "output": "[5, 4, 3]",
      "explanation": "Готовый к запуску пример: Из массива в список."
    }
  ],
  "9": [
    {
      "title": "Простое if",
      "code": "int age = 14;\nif (age >= 12) System.out.println(\"Подросток\");",
      "output": "Подросток",
      "explanation": "Готовый к запуску пример: Простое if."
    },
    {
      "title": "if-else",
      "code": "int t = -5;\nif (t > 0) System.out.println(\"тепло\");\nelse System.out.println(\"холодно\");",
      "output": "холодно",
      "explanation": "Готовый к запуску пример: if-else."
    },
    {
      "title": "else-if цепочка",
      "code": "int s = 75;\nif (s >= 90) System.out.println(\"5\");\nelse if (s >= 70) System.out.println(\"4\");\nelse System.out.println(\"3\");",
      "output": "4",
      "explanation": "Готовый к запуску пример: else-if цепочка."
    },
    {
      "title": "Чётное / нечётное",
      "code": "int n = 7;\nif (n % 2 == 0) System.out.println(\"чёт\"); else System.out.println(\"нечёт\");",
      "output": "нечёт",
      "explanation": "Готовый к запуску пример: Чётное / нечётное."
    },
    {
      "title": "Максимум двух",
      "code": "int a = 10, b = 7;\nif (a > b) System.out.println(a); else System.out.println(b);",
      "output": "10",
      "explanation": "Готовый к запуску пример: Максимум двух."
    },
    {
      "title": "Високосный год",
      "code": "int y = 2024;\nif ((y%4==0 && y%100!=0) || y%400==0) System.out.println(\"високосный\");\nelse System.out.println(\"обычный\");",
      "output": "високосный",
      "explanation": "Готовый к запуску пример: Високосный год."
    },
    {
      "title": "Логическое И",
      "code": "int age = 16; boolean билет = true;\nif (age >= 12 && билет) System.out.println(\"Пускаем\");",
      "output": "Пускаем",
      "explanation": "Готовый к запуску пример: Логическое И."
    },
    {
      "title": "Логическое ИЛИ",
      "code": "String day = \"СБ\";\nif (day.equals(\"СБ\") || day.equals(\"ВС\")) System.out.println(\"Выходной\");",
      "output": "Выходной",
      "explanation": "Готовый к запуску пример: Логическое ИЛИ."
    },
    {
      "title": "Тернарный оператор",
      "code": "int n = 4;\nSystem.out.println(n >= 0 ? \"плюс\" : \"минус\");",
      "output": "плюс",
      "explanation": "Готовый к запуску пример: Тернарный оператор."
    },
    {
      "title": "Вложенные if",
      "code": "int balance = 500, price = 300;\nif (balance > 0){\n  if (balance >= price) System.out.println(\"Покупка ОК\");\n  else System.out.println(\"Не хватает\");\n}",
      "output": "Покупка ОК",
      "explanation": "Готовый к запуску пример: Вложенные if."
    }
  ],
  "10": [
    {
      "title": "Дни недели",
      "code": "int day = 3;\nswitch (day){\n  case 1: System.out.println(\"Пн\"); break;\n  case 2: System.out.println(\"Вт\"); break;\n  case 3: System.out.println(\"Ср\"); break;\n  default: System.out.println(\"?\");\n}",
      "output": "Ср",
      "explanation": "Готовый к запуску пример: Дни недели."
    },
    {
      "title": "Без break (fall-through)",
      "code": "int x = 1;\nswitch (x){\n  case 1:\n  case 2: System.out.println(\"мало\"); break;\n  case 3: System.out.println(\"много\"); break;\n}",
      "output": "мало",
      "explanation": "Готовый к запуску пример: Без break (fall-through)."
    },
    {
      "title": "switch по String",
      "code": "String f = \"банан\";\nswitch (f){\n  case \"яблоко\": System.out.println(\"красное\"); break;\n  case \"банан\": System.out.println(\"жёлтый\"); break;\n  default: System.out.println(\"?\");\n}",
      "output": "жёлтый",
      "explanation": "Готовый к запуску пример: switch по String."
    },
    {
      "title": "default",
      "code": "int n = 99;\nswitch (n){\n  case 1: System.out.println(\"один\"); break;\n  default: System.out.println(\"другое\");\n}",
      "output": "другое",
      "explanation": "Готовый к запуску пример: default."
    },
    {
      "title": "switch-expression (Java 14+)",
      "code": "int m = 4;\nString s = switch (m){\n  case 12,1,2 -> \"зима\";\n  case 3,4,5 -> \"весна\";\n  case 6,7,8 -> \"лето\";\n  default -> \"осень\";\n};\nSystem.out.println(s);",
      "output": "весна",
      "explanation": "Готовый к запуску пример: switch-expression (Java 14+)."
    },
    {
      "title": "Меню действий",
      "code": "int act = 2;\nswitch (act){\n  case 1 -> System.out.println(\"новая игра\");\n  case 2 -> System.out.println(\"загрузка\");\n  case 3 -> System.out.println(\"выход\");\n}",
      "output": "загрузка",
      "explanation": "Готовый к запуску пример: Меню действий."
    },
    {
      "title": "Светофор",
      "code": "String c = \"red\";\nswitch (c){\n  case \"red\": System.out.println(\"стой\"); break;\n  case \"yellow\": System.out.println(\"внимание\"); break;\n  case \"green\": System.out.println(\"иди\"); break;\n}",
      "output": "стой",
      "explanation": "Готовый к запуску пример: Светофор."
    },
    {
      "title": "Оценка",
      "code": "int g = 4;\nswitch (g){\n  case 5: System.out.println(\"отлично\"); break;\n  case 4: System.out.println(\"хорошо\"); break;\n  case 3: System.out.println(\"удовл.\"); break;\n  default: System.out.println(\"плохо\");\n}",
      "output": "хорошо",
      "explanation": "Готовый к запуску пример: Оценка."
    },
    {
      "title": "enum в switch",
      "code": "enum Color{RED,GREEN,BLUE}\npublic class Main { public static void main(String[]a){\n  Color c = Color.GREEN;\n  switch (c){\n    case RED -> System.out.println(\"красный\");\n    case GREEN -> System.out.println(\"зелёный\");\n    case BLUE -> System.out.println(\"синий\");\n  }\n}}",
      "output": "зелёный",
      "explanation": "Готовый к запуску пример: enum в switch."
    },
    {
      "title": "yield в switch-expr",
      "code": "int n = 2;\nint sq = switch(n){\n  case 1 -> 1;\n  case 2 -> { yield n * n; }\n  default -> 0;\n};\nSystem.out.println(sq);",
      "output": "4",
      "explanation": "Готовый к запуску пример: yield в switch-expr."
    }
  ],
  "11": [
    {
      "title": "Простой for",
      "code": "for (int i = 0; i < 5; i++) System.out.println(i);",
      "output": "0\n1\n2\n3\n4",
      "explanation": "Готовый к запуску пример: Простой for."
    },
    {
      "title": "Обратный for",
      "code": "for (int i = 5; i >= 1; i--) System.out.print(i + \" \");",
      "output": "5 4 3 2 1 ",
      "explanation": "Готовый к запуску пример: Обратный for."
    },
    {
      "title": "Шаг 2",
      "code": "for (int i = 0; i <= 10; i += 2) System.out.print(i + \" \");",
      "output": "0 2 4 6 8 10 ",
      "explanation": "Готовый к запуску пример: Шаг 2."
    },
    {
      "title": "while",
      "code": "int n = 3;\nwhile (n > 0){ System.out.println(n); n--; }",
      "output": "3\n2\n1",
      "explanation": "Готовый к запуску пример: while."
    },
    {
      "title": "do-while",
      "code": "int n = 0;\ndo { System.out.println(\"раз\"); n++; } while (n < 1);",
      "output": "раз",
      "explanation": "Готовый к запуску пример: do-while."
    },
    {
      "title": "for-each по массиву",
      "code": "String[] a = {\"a\",\"b\",\"c\"};\nfor (String s : a) System.out.println(s);",
      "output": "a\nb\nc",
      "explanation": "Готовый к запуску пример: for-each по массиву."
    },
    {
      "title": "Сумма 1..100",
      "code": "int s = 0;\nfor (int i = 1; i <= 100; i++) s += i;\nSystem.out.println(s);",
      "output": "5050",
      "explanation": "Готовый к запуску пример: Сумма 1..100."
    },
    {
      "title": "break",
      "code": "for (int i = 0; i < 10; i++){\n  if (i == 3) break;\n  System.out.println(i);\n}",
      "output": "0\n1\n2",
      "explanation": "Готовый к запуску пример: break."
    },
    {
      "title": "continue",
      "code": "for (int i = 0; i < 6; i++){\n  if (i % 2 == 0) continue;\n  System.out.println(i);\n}",
      "output": "1\n3\n5",
      "explanation": "Готовый к запуску пример: continue."
    },
    {
      "title": "Факториал",
      "code": "int n = 5, f = 1;\nfor (int i = 2; i <= n; i++) f *= i;\nSystem.out.println(f);",
      "output": "120",
      "explanation": "Готовый к запуску пример: Факториал."
    }
  ],
  "12": [
    {
      "title": "Пары координат",
      "code": "for (int y = 0; y < 2; y++)\n  for (int x = 0; x < 2; x++)\n    System.out.println(x + \",\" + y);",
      "output": "0,0\n1,0\n0,1\n1,1",
      "explanation": "Готовый к запуску пример: Пары координат."
    },
    {
      "title": "Таблица 5x5",
      "code": "for (int i = 1; i <= 5; i++){\n  for (int j = 1; j <= 5; j++) System.out.print(i*j + \"\\t\");\n  System.out.println();\n}",
      "output": "умножение 1..5",
      "explanation": "Готовый к запуску пример: Таблица 5x5."
    },
    {
      "title": "Прямоугольник звёзд",
      "code": "int w=5,h=3;\nfor (int i=0;i<h;i++){\n  for (int j=0;j<w;j++) System.out.print('*');\n  System.out.println();\n}",
      "output": "*****\n*****\n*****",
      "explanation": "Готовый к запуску пример: Прямоугольник звёзд."
    },
    {
      "title": "Прямоугольный треугольник",
      "code": "int n=4;\nfor (int i=1;i<=n;i++){\n  for (int j=0;j<i;j++) System.out.print('*');\n  System.out.println();\n}",
      "output": "*\n**\n***\n****",
      "explanation": "Готовый к запуску пример: Прямоугольный треугольник."
    },
    {
      "title": "Перевёрнутый треугольник",
      "code": "int n=4;\nfor (int i=n;i>=1;i--){\n  for (int j=0;j<i;j++) System.out.print('*');\n  System.out.println();\n}",
      "output": "****\n***\n**\n*",
      "explanation": "Готовый к запуску пример: Перевёрнутый треугольник."
    },
    {
      "title": "Сумма матрицы",
      "code": "int[][] m = {{1,2},{3,4}};\nint s = 0;\nfor (int i=0;i<m.length;i++)\n  for (int j=0;j<m[i].length;j++) s += m[i][j];\nSystem.out.println(s);",
      "output": "10",
      "explanation": "Готовый к запуску пример: Сумма матрицы."
    },
    {
      "title": "Простые числа до 20",
      "code": "for (int n=2;n<=20;n++){\n  boolean prime = true;\n  for (int d=2;d*d<=n;d++) if (n%d==0){ prime=false; break; }\n  if (prime) System.out.print(n+\" \");\n}",
      "output": "2 3 5 7 11 13 17 19 ",
      "explanation": "Готовый к запуску пример: Простые числа до 20."
    },
    {
      "title": "Пары без повторов",
      "code": "int[] a = {1,2,3,4};\nfor (int i=0;i<a.length;i++)\n  for (int j=i+1;j<a.length;j++)\n    System.out.println(a[i]+\"-\"+a[j]);",
      "output": "6 пар: 1-2,1-3,1-4,2-3,2-4,3-4",
      "explanation": "Готовый к запуску пример: Пары без повторов."
    },
    {
      "title": "Поиск в матрице",
      "code": "int[][] m = {{1,2,3},{4,5,6}};\nint x = 5; String found = \"нет\";\nouter:\nfor (int i=0;i<m.length;i++)\n  for (int j=0;j<m[i].length;j++)\n    if (m[i][j]==x){ found = i+\",\"+j; break outer; }\nSystem.out.println(found);",
      "output": "1,1",
      "explanation": "Готовый к запуску пример: Поиск в матрице."
    },
    {
      "title": "Ромб",
      "code": "int n = 3;\nfor (int i=1;i<=n;i++){\n  for (int s=0;s<n-i;s++) System.out.print(' ');\n  for (int s=0;s<2*i-1;s++) System.out.print('*');\n  System.out.println();\n}",
      "output": "  *\n ***\n*****",
      "explanation": "Готовый к запуску пример: Ромб."
    }
  ],
  "13": [
    {
      "title": "Метод суммы",
      "code": "public class Main {\n  static int sum(int a, int b){ return a + b; }\n  public static void main(String[] args){\n    System.out.println(sum(2, 3));\n  }\n}",
      "output": "5",
      "explanation": "Готовый к запуску пример: Метод суммы."
    },
    {
      "title": "void метод приветствия",
      "code": "public class Main {\n  static void greet(String n){ System.out.println(\"Привет, \" + n); }\n  public static void main(String[] args){ greet(\"Аня\"); }\n}",
      "output": "Привет, Аня",
      "explanation": "Готовый к запуску пример: void метод приветствия."
    },
    {
      "title": "Метод max",
      "code": "public class Main {\n  static int max(int a, int b){ return a > b ? a : b; }\n  public static void main(String[] args){ System.out.println(max(7, 12)); }\n}",
      "output": "12",
      "explanation": "Готовый к запуску пример: Метод max."
    },
    {
      "title": "Метод квадрат",
      "code": "public class Main {\n  static int sqr(int x){ return x * x; }\n  public static void main(String[] args){ System.out.println(sqr(9)); }\n}",
      "output": "81",
      "explanation": "Готовый к запуску пример: Метод квадрат."
    },
    {
      "title": "Метод чёт?",
      "code": "public class Main {\n  static boolean isEven(int n){ return n % 2 == 0; }\n  public static void main(String[] args){ System.out.println(isEven(10)); }\n}",
      "output": "true",
      "explanation": "Готовый к запуску пример: Метод чёт?."
    },
    {
      "title": "Метод по массиву",
      "code": "public class Main {\n  static int sumArr(int[] a){ int s=0; for (int x:a) s+=x; return s; }\n  public static void main(String[] args){ System.out.println(sumArr(new int[]{1,2,3,4})); }\n}",
      "output": "10",
      "explanation": "Готовый к запуску пример: Метод по массиву."
    },
    {
      "title": "Несколько параметров",
      "code": "public class Main {\n  static double price(int qty, double unit, double tax){\n    return qty * unit * (1 + tax);\n  }\n  public static void main(String[] args){ System.out.println(price(3, 100, 0.2)); }\n}",
      "output": "360.0",
      "explanation": "Готовый к запуску пример: Несколько параметров."
    },
    {
      "title": "Метод возврата String",
      "code": "public class Main {\n  static String hello(String n){ return \"Hi, \" + n; }\n  public static void main(String[] args){ System.out.println(hello(\"Java\")); }\n}",
      "output": "Hi, Java",
      "explanation": "Готовый к запуску пример: Метод возврата String."
    },
    {
      "title": "Метод-проверка пароля",
      "code": "public class Main {\n  static boolean ok(String p){ return p.length() >= 6; }\n  public static void main(String[] args){ System.out.println(ok(\"qwerty\")); }\n}",
      "output": "true",
      "explanation": "Готовый к запуску пример: Метод-проверка пароля."
    },
    {
      "title": "Несколько методов",
      "code": "public class Main {\n  static int sqr(int x){ return x*x; }\n  static int cube(int x){ return x*x*x; }\n  public static void main(String[] args){\n    System.out.println(sqr(4) + \" \" + cube(3));\n  }\n}",
      "output": "16 27",
      "explanation": "Готовый к запуску пример: Несколько методов."
    }
  ],
  "14": [
    {
      "title": "Два add",
      "code": "public class Main {\n  static int add(int a, int b){ return a+b; }\n  static double add(double a, double b){ return a+b; }\n  public static void main(String[] args){\n    System.out.println(add(2,3) + \" \" + add(1.5, 2.5));\n  }\n}",
      "output": "5 4.0",
      "explanation": "Готовый к запуску пример: Два add."
    },
    {
      "title": "add с тремя аргументами",
      "code": "public class Main {\n  static int add(int a, int b){ return a+b; }\n  static int add(int a, int b, int c){ return a+b+c; }\n  public static void main(String[] args){ System.out.println(add(1,2,3)); }\n}",
      "output": "6",
      "explanation": "Готовый к запуску пример: add с тремя аргументами."
    },
    {
      "title": "print для разных типов",
      "code": "public class Main {\n  static void print(int x){ System.out.println(\"int: \"+x); }\n  static void print(String x){ System.out.println(\"str: \"+x); }\n  public static void main(String[] args){ print(5); print(\"hi\"); }\n}",
      "output": "int: 5\nstr: hi",
      "explanation": "Готовый к запуску пример: print для разных типов."
    },
    {
      "title": "max int / double",
      "code": "public class Main {\n  static int max(int a, int b){ return a>b?a:b; }\n  static double max(double a, double b){ return a>b?a:b; }\n  public static void main(String[] args){\n    System.out.println(max(3,7) + \" \" + max(1.5, 0.9));\n  }\n}",
      "output": "7 1.5",
      "explanation": "Готовый к запуску пример: max int / double."
    },
    {
      "title": "Конструктор-перегрузка",
      "code": "public class Main {\n  static class Point{\n    int x, y;\n    Point(){ this(0,0); }\n    Point(int x, int y){ this.x=x; this.y=y; }\n  }\n  public static void main(String[] args){\n    Point p = new Point();\n    System.out.println(p.x + \",\" + p.y);\n  }\n}",
      "output": "0,0",
      "explanation": "Готовый к запуску пример: Конструктор-перегрузка."
    },
    {
      "title": "concat 2/3 строк",
      "code": "public class Main {\n  static String concat(String a, String b){ return a+b; }\n  static String concat(String a, String b, String c){ return a+b+c; }\n  public static void main(String[] args){ System.out.println(concat(\"Ja\",\"va\",\"!\")); }\n}",
      "output": "Java!",
      "explanation": "Готовый к запуску пример: concat 2/3 строк."
    },
    {
      "title": "greet с/без имени",
      "code": "public class Main {\n  static void greet(){ System.out.println(\"Привет!\"); }\n  static void greet(String n){ System.out.println(\"Привет, \"+n); }\n  public static void main(String[] args){ greet(); greet(\"Аня\"); }\n}",
      "output": "Привет!\nПривет, Аня",
      "explanation": "Готовый к запуску пример: greet с/без имени."
    },
    {
      "title": "area прямоугольник/круг",
      "code": "public class Main {\n  static double area(double w, double h){ return w*h; }\n  static double area(double r){ return Math.PI*r*r; }\n  public static void main(String[] args){\n    System.out.println(area(3,4) + \" / \" + area(2));\n  }\n}",
      "output": "12.0 / 12.566370614359172",
      "explanation": "Готовый к запуску пример: area прямоугольник/круг."
    },
    {
      "title": "sum int[] / double[]",
      "code": "public class Main {\n  static int sum(int[] a){ int s=0; for(int x:a) s+=x; return s; }\n  static double sum(double[] a){ double s=0; for(double x:a) s+=x; return s; }\n  public static void main(String[] args){\n    System.out.println(sum(new int[]{1,2,3}) + \" / \" + sum(new double[]{1.5,2.5}));\n  }\n}",
      "output": "6 / 4.0",
      "explanation": "Готовый к запуску пример: sum int[] / double[]."
    },
    {
      "title": "print с количеством",
      "code": "public class Main {\n  static void print(String s){ System.out.println(s); }\n  static void print(String s, int n){ for (int i=0;i<n;i++) System.out.println(s); }\n  public static void main(String[] args){ print(\"hi\", 3); }\n}",
      "output": "hi\nhi\nhi",
      "explanation": "Готовый к запуску пример: print с количеством."
    }
  ],
  "15": [
    {
      "title": "sum varargs",
      "code": "public class Main {\n  static int sum(int... nums){ int s=0; for (int n:nums) s+=n; return s; }\n  public static void main(String[] args){ System.out.println(sum(1,2,3,4)); }\n}",
      "output": "10",
      "explanation": "Готовый к запуску пример: sum varargs."
    },
    {
      "title": "Пустой вызов",
      "code": "public class Main {\n  static int sum(int... nums){ int s=0; for (int n:nums) s+=n; return s; }\n  public static void main(String[] args){ System.out.println(sum()); }\n}",
      "output": "0",
      "explanation": "Готовый к запуску пример: Пустой вызов."
    },
    {
      "title": "Среднее",
      "code": "public class Main {\n  static double avg(double... v){ double s=0; for(double x:v) s+=x; return s/v.length; }\n  public static void main(String[] args){ System.out.println(avg(2,4,6,8)); }\n}",
      "output": "5.0",
      "explanation": "Готовый к запуску пример: Среднее."
    },
    {
      "title": "Макс из varargs",
      "code": "public class Main {\n  static int max(int... v){ int m=v[0]; for(int x:v) if(x>m) m=x; return m; }\n  public static void main(String[] args){ System.out.println(max(3,7,1,9,2)); }\n}",
      "output": "9",
      "explanation": "Готовый к запуску пример: Макс из varargs."
    },
    {
      "title": "printAll",
      "code": "public class Main {\n  static void printAll(String... s){ for(String x:s) System.out.println(x); }\n  public static void main(String[] args){ printAll(\"раз\",\"два\",\"три\"); }\n}",
      "output": "раз\nдва\nтри",
      "explanation": "Готовый к запуску пример: printAll."
    },
    {
      "title": "Конкатенация",
      "code": "public class Main {\n  static String join(String sep, String... w){\n    StringBuilder sb = new StringBuilder();\n    for (int i=0;i<w.length;i++){ if (i>0) sb.append(sep); sb.append(w[i]); }\n    return sb.toString();\n  }\n  public static void main(String[] args){ System.out.println(join(\"-\",\"A\",\"B\",\"C\")); }\n}",
      "output": "A-B-C",
      "explanation": "Готовый к запуску пример: Конкатенация."
    },
    {
      "title": "Минимум",
      "code": "public class Main {\n  static int min(int... v){ int m=v[0]; for(int x:v) if(x<m) m=x; return m; }\n  public static void main(String[] args){ System.out.println(min(5,1,3,7)); }\n}",
      "output": "1",
      "explanation": "Готовый к запуску пример: Минимум."
    },
    {
      "title": "Подсчёт чётных",
      "code": "public class Main {\n  static int evens(int... v){ int c=0; for(int x:v) if(x%2==0) c++; return c; }\n  public static void main(String[] args){ System.out.println(evens(1,2,3,4,5,6)); }\n}",
      "output": "3",
      "explanation": "Готовый к запуску пример: Подсчёт чётных."
    },
    {
      "title": "Передача массива",
      "code": "public class Main {\n  static int sum(int... v){ int s=0; for(int x:v) s+=x; return s; }\n  public static void main(String[] args){ int[] a={10,20,30}; System.out.println(sum(a)); }\n}",
      "output": "60",
      "explanation": "Готовый к запуску пример: Передача массива."
    },
    {
      "title": "String.format с varargs",
      "code": "System.out.println(String.format(\"%s = %d + %d\", \"sum\", 2, 3));",
      "output": "sum = 2 + 3",
      "explanation": "Готовый к запуску пример: String.format с varargs."
    }
  ],
  "16": [
    {
      "title": "Локальная переменная",
      "code": "public class Main {\n  public static void main(String[] args){\n    int x = 5;\n    System.out.println(x);\n  }\n}",
      "output": "5",
      "explanation": "Готовый к запуску пример: Локальная переменная."
    },
    {
      "title": "Поле класса",
      "code": "public class Main {\n  static int field = 10;\n  public static void main(String[] args){ System.out.println(field); }\n}",
      "output": "10",
      "explanation": "Готовый к запуску пример: Поле класса."
    },
    {
      "title": "Тень имени",
      "code": "public class Main {\n  static int x = 1;\n  public static void main(String[] args){ int x = 99; System.out.println(x); }\n}",
      "output": "99",
      "explanation": "Готовый к запуску пример: Тень имени."
    },
    {
      "title": "Видимость в блоке",
      "code": "public class Main {\n  public static void main(String[] args){\n    { int y = 7; System.out.println(y); }\n    // здесь y уже не виден\n  }\n}",
      "output": "7",
      "explanation": "Готовый к запуску пример: Видимость в блоке."
    },
    {
      "title": "В цикле",
      "code": "public class Main {\n  public static void main(String[] args){\n    for (int i = 0; i < 3; i++){ System.out.println(i); }\n    // i здесь недоступен\n  }\n}",
      "output": "0\n1\n2",
      "explanation": "Готовый к запуску пример: В цикле."
    },
    {
      "title": "Параметр метода",
      "code": "public class Main {\n  static void p(int n){ System.out.println(n); }\n  public static void main(String[] args){ p(42); }\n}",
      "output": "42",
      "explanation": "Готовый к запуску пример: Параметр метода."
    },
    {
      "title": "Поле через this",
      "code": "public class Main {\n  static class T { int x; T(int x){ this.x = x; } }\n  public static void main(String[] args){ System.out.println(new T(5).x); }\n}",
      "output": "5",
      "explanation": "Готовый к запуску пример: Поле через this."
    },
    {
      "title": "Общая переменная нескольких методов",
      "code": "public class Main {\n  static int counter = 0;\n  static void inc(){ counter++; }\n  public static void main(String[] args){ inc(); inc(); inc(); System.out.println(counter); }\n}",
      "output": "3",
      "explanation": "Готовый к запуску пример: Общая переменная нескольких методов."
    },
    {
      "title": "Возврат значения",
      "code": "public class Main {\n  static int get(){ int local = 100; return local; }\n  public static void main(String[] args){ System.out.println(get()); }\n}",
      "output": "100",
      "explanation": "Готовый к запуску пример: Возврат значения."
    },
    {
      "title": "Видимость в if",
      "code": "public class Main {\n  public static void main(String[] args){\n    if (true){ String s = \"внутри\"; System.out.println(s); }\n  }\n}",
      "output": "внутри",
      "explanation": "Готовый к запуску пример: Видимость в if."
    }
  ],
  "17": [
    {
      "title": "Факториал",
      "code": "public class Main {\n  static int fact(int n){ return n <= 1 ? 1 : n * fact(n - 1); }\n  public static void main(String[] args){ System.out.println(fact(5)); }\n}",
      "output": "120",
      "explanation": "Готовый к запуску пример: Факториал."
    },
    {
      "title": "Сумма от 1 до n",
      "code": "public class Main {\n  static int sum(int n){ return n == 0 ? 0 : n + sum(n - 1); }\n  public static void main(String[] args){ System.out.println(sum(10)); }\n}",
      "output": "55",
      "explanation": "Готовый к запуску пример: Сумма от 1 до n."
    },
    {
      "title": "Фибоначчи",
      "code": "public class Main {\n  static int fib(int n){ return n < 2 ? n : fib(n-1) + fib(n-2); }\n  public static void main(String[] args){ System.out.println(fib(10)); }\n}",
      "output": "55",
      "explanation": "Готовый к запуску пример: Фибоначчи."
    },
    {
      "title": "Степень",
      "code": "public class Main {\n  static int pow(int x, int n){ return n == 0 ? 1 : x * pow(x, n-1); }\n  public static void main(String[] args){ System.out.println(pow(2, 10)); }\n}",
      "output": "1024",
      "explanation": "Готовый к запуску пример: Степень."
    },
    {
      "title": "Реверс строки",
      "code": "public class Main {\n  static String rev(String s){ return s.isEmpty() ? s : rev(s.substring(1)) + s.charAt(0); }\n  public static void main(String[] args){ System.out.println(rev(\"hello\")); }\n}",
      "output": "olleh",
      "explanation": "Готовый к запуску пример: Реверс строки."
    },
    {
      "title": "НОД",
      "code": "public class Main {\n  static int gcd(int a, int b){ return b == 0 ? a : gcd(b, a % b); }\n  public static void main(String[] args){ System.out.println(gcd(24, 36)); }\n}",
      "output": "12",
      "explanation": "Готовый к запуску пример: НОД."
    },
    {
      "title": "Сумма цифр",
      "code": "public class Main {\n  static int digits(int n){ return n == 0 ? 0 : n % 10 + digits(n / 10); }\n  public static void main(String[] args){ System.out.println(digits(12345)); }\n}",
      "output": "15",
      "explanation": "Готовый к запуску пример: Сумма цифр."
    },
    {
      "title": "Кол-во цифр",
      "code": "public class Main {\n  static int count(int n){ return n < 10 ? 1 : 1 + count(n / 10); }\n  public static void main(String[] args){ System.out.println(count(98765)); }\n}",
      "output": "5",
      "explanation": "Готовый к запуску пример: Кол-во цифр."
    },
    {
      "title": "Бинарный поиск рекурсией",
      "code": "public class Main {\n  static int bs(int[] a, int x, int lo, int hi){\n    if (lo > hi) return -1;\n    int m = (lo+hi)/2;\n    if (a[m] == x) return m;\n    return a[m] < x ? bs(a, x, m+1, hi) : bs(a, x, lo, m-1);\n  }\n  public static void main(String[] args){\n    int[] a = {1,3,5,7,9,11};\n    System.out.println(bs(a, 7, 0, a.length-1));\n  }\n}",
      "output": "3",
      "explanation": "Готовый к запуску пример: Бинарный поиск рекурсией."
    },
    {
      "title": "Степени двойки",
      "code": "public class Main {\n  static void p2(int n){ if (n == 0) return; p2(n-1); System.out.print((int)Math.pow(2,n-1)+\" \"); }\n  public static void main(String[] args){ p2(5); }\n}",
      "output": "1 2 4 8 16 ",
      "explanation": "Готовый к запуску пример: Степени двойки."
    }
  ],
  "18": [
    {
      "title": "Класс Dog",
      "code": "class Dog {\n  String name;\n  void bark(){ System.out.println(name + \": Гав!\"); }\n}\npublic class Main {\n  public static void main(String[] args){\n    Dog d = new Dog();\n    d.name = \"Рекс\";\n    d.bark();\n  }\n}",
      "output": "Рекс: Гав!",
      "explanation": "Готовый к запуску пример: Класс Dog."
    },
    {
      "title": "Класс Book",
      "code": "class Book {\n  String title;\n  int pages;\n}\npublic class Main {\n  public static void main(String[] args){\n    Book b = new Book();\n    b.title = \"Java\"; b.pages = 300;\n    System.out.println(b.title + \" / \" + b.pages);\n  }\n}",
      "output": "Java / 300",
      "explanation": "Готовый к запуску пример: Класс Book."
    },
    {
      "title": "Несколько объектов",
      "code": "class Cat {\n  String name;\n}\npublic class Main {\n  public static void main(String[] args){\n    Cat a = new Cat(); a.name = \"Мурка\";\n    Cat b = new Cat(); b.name = \"Барсик\";\n    System.out.println(a.name + \" и \" + b.name);\n  }\n}",
      "output": "Мурка и Барсик",
      "explanation": "Готовый к запуску пример: Несколько объектов."
    },
    {
      "title": "Метод с return",
      "code": "class Calc {\n  int add(int a, int b){ return a + b; }\n}\npublic class Main {\n  public static void main(String[] args){\n    System.out.println(new Calc().add(7, 8));\n  }\n}",
      "output": "15",
      "explanation": "Готовый к запуску пример: Метод с return."
    },
    {
      "title": "Объект как параметр",
      "code": "class Point { int x, y; }\npublic class Main {\n  static int dist(Point p){ return p.x*p.x + p.y*p.y; }\n  public static void main(String[] args){\n    Point p = new Point(); p.x = 3; p.y = 4;\n    System.out.println(dist(p));\n  }\n}",
      "output": "25",
      "explanation": "Готовый к запуску пример: Объект как параметр."
    },
    {
      "title": "Массив объектов",
      "code": "class Student { String name; }\npublic class Main {\n  public static void main(String[] args){\n    Student[] s = new Student[2];\n    s[0] = new Student(); s[0].name = \"Аня\";\n    s[1] = new Student(); s[1].name = \"Боря\";\n    for (Student st : s) System.out.println(st.name);\n  }\n}",
      "output": "Аня\nБоря",
      "explanation": "Готовый к запуску пример: Массив объектов."
    },
    {
      "title": "null-объект",
      "code": "class T { int x; }\npublic class Main {\n  public static void main(String[] args){\n    T t = null;\n    System.out.println(t == null);\n  }\n}",
      "output": "true",
      "explanation": "Готовый к запуску пример: null-объект."
    },
    {
      "title": "Состояние объекта",
      "code": "class Counter { int n = 0; void inc(){ n++; } }\npublic class Main {\n  public static void main(String[] args){\n    Counter c = new Counter();\n    c.inc(); c.inc(); c.inc();\n    System.out.println(c.n);\n  }\n}",
      "output": "3",
      "explanation": "Готовый к запуску пример: Состояние объекта."
    },
    {
      "title": "Ссылки",
      "code": "class T { int x; }\npublic class Main {\n  public static void main(String[] args){\n    T a = new T(); a.x = 5;\n    T b = a; b.x = 99;\n    System.out.println(a.x);\n  }\n}",
      "output": "99",
      "explanation": "Готовый к запуску пример: Ссылки."
    },
    {
      "title": "Метод изменяет поле",
      "code": "class Lamp { boolean on; void toggle(){ on = !on; } }\npublic class Main {\n  public static void main(String[] args){\n    Lamp l = new Lamp();\n    l.toggle();\n    System.out.println(l.on);\n  }\n}",
      "output": "true",
      "explanation": "Готовый к запуску пример: Метод изменяет поле."
    }
  ],
  "19": [
    {
      "title": "Конструктор с двумя полями",
      "code": "class Dog {\n  String name; int age;\n  Dog(String name, int age){ this.name = name; this.age = age; }\n}\npublic class Main {\n  public static void main(String[] args){\n    Dog d = new Dog(\"Рекс\", 3);\n    System.out.println(d.name + \", \" + d.age);\n  }\n}",
      "output": "Рекс, 3",
      "explanation": "Готовый к запуску пример: Конструктор с двумя полями."
    },
    {
      "title": "Конструктор без параметров",
      "code": "class Cat { String name = \"безымянный\"; Cat(){} }\npublic class Main { public static void main(String[] args){ System.out.println(new Cat().name); }}",
      "output": "безымянный",
      "explanation": "Готовый к запуску пример: Конструктор без параметров."
    },
    {
      "title": "Конструктор по умолчанию",
      "code": "class T { int x; }\npublic class Main { public static void main(String[] args){ System.out.println(new T().x); }}",
      "output": "0",
      "explanation": "Готовый к запуску пример: Конструктор по умолчанию."
    },
    {
      "title": "Перегрузка конструкторов",
      "code": "class P { int x, y; P(){this(0,0);} P(int x, int y){ this.x=x; this.y=y; } }\npublic class Main { public static void main(String[] args){ P p = new P(); System.out.println(p.x+\",\"+p.y); }}",
      "output": "0,0",
      "explanation": "Готовый к запуску пример: Перегрузка конструкторов."
    },
    {
      "title": "this() вызов",
      "code": "class A { int n; A(){ this(7); } A(int n){ this.n = n; } }\npublic class Main { public static void main(String[] args){ System.out.println(new A().n); }}",
      "output": "7",
      "explanation": "Готовый к запуску пример: this() вызов."
    },
    {
      "title": "Конструктор и проверка",
      "code": "class Acc { double bal; Acc(double b){ if (b < 0) b = 0; this.bal = b; } }\npublic class Main { public static void main(String[] args){ System.out.println(new Acc(-50).bal); }}",
      "output": "0.0",
      "explanation": "Готовый к запуску пример: Конструктор и проверка."
    },
    {
      "title": "super() вызов",
      "code": "class A { A(){ System.out.println(\"A\"); } }\nclass B extends A { B(){ super(); System.out.println(\"B\"); } }\npublic class Main { public static void main(String[] args){ new B(); }}",
      "output": "A\nB",
      "explanation": "Готовый к запуску пример: super() вызов."
    },
    {
      "title": "Конструктор с массивом",
      "code": "class Bag { int[] items; Bag(int n){ items = new int[n]; } }\npublic class Main { public static void main(String[] args){ System.out.println(new Bag(5).items.length); }}",
      "output": "5",
      "explanation": "Готовый к запуску пример: Конструктор с массивом."
    },
    {
      "title": "final поле через конструктор",
      "code": "class P { final String name; P(String n){ name = n; } }\npublic class Main { public static void main(String[] args){ System.out.println(new P(\"Аня\").name); }}",
      "output": "Аня",
      "explanation": "Готовый к запуску пример: final поле через конструктор."
    },
    {
      "title": "Цепочка конструкторов",
      "code": "class Box { int w, h; Box(){ this(1); } Box(int s){ this(s, s); } Box(int w, int h){ this.w=w; this.h=h; } }\npublic class Main { public static void main(String[] args){ Box b = new Box(); System.out.println(b.w+\"x\"+b.h); }}",
      "output": "1x1",
      "explanation": "Готовый к запуску пример: Цепочка конструкторов."
    }
  ],
  "20": [
    {
      "title": "Статический счётчик",
      "code": "class Counter { static int n = 0; static void inc(){ n++; } }\npublic class Main { public static void main(String[] args){ Counter.inc(); Counter.inc(); System.out.println(Counter.n); }}",
      "output": "2",
      "explanation": "Готовый к запуску пример: Статический счётчик."
    },
    {
      "title": "Math.sqrt",
      "code": "System.out.println(Math.sqrt(144));",
      "output": "12.0",
      "explanation": "Готовый к запуску пример: Math.sqrt."
    },
    {
      "title": "Math.PI",
      "code": "System.out.println(Math.PI);",
      "output": "3.141592653589793",
      "explanation": "Готовый к запуску пример: Math.PI."
    },
    {
      "title": "Статический метод",
      "code": "class U { static int sqr(int x){ return x*x; } }\npublic class Main { public static void main(String[] args){ System.out.println(U.sqr(7)); }}",
      "output": "49",
      "explanation": "Готовый к запуску пример: Статический метод."
    },
    {
      "title": "Статика и экземпляр",
      "code": "class T { static int s = 0; int i = 0; }\npublic class Main { public static void main(String[] args){\n  T a = new T(); T b = new T();\n  T.s = 10; a.i = 1; b.i = 2;\n  System.out.println(T.s + \" \" + a.i + \" \" + b.i);\n}}",
      "output": "10 1 2",
      "explanation": "Готовый к запуску пример: Статика и экземпляр."
    },
    {
      "title": "Статический блок",
      "code": "class A { static int x; static { x = 42; System.out.println(\"init\"); } }\npublic class Main { public static void main(String[] args){ System.out.println(A.x); }}",
      "output": "init\n42",
      "explanation": "Готовый к запуску пример: Статический блок."
    },
    {
      "title": "Утилитный класс",
      "code": "class StrUtil { static String shout(String s){ return s.toUpperCase() + \"!\"; } }\npublic class Main { public static void main(String[] args){ System.out.println(StrUtil.shout(\"hi\")); }}",
      "output": "HI!",
      "explanation": "Готовый к запуску пример: Утилитный класс."
    },
    {
      "title": "Статическая константа",
      "code": "class Cfg { static final int MAX = 100; }\npublic class Main { public static void main(String[] args){ System.out.println(Cfg.MAX); }}",
      "output": "100",
      "explanation": "Готовый к запуску пример: Статическая константа."
    },
    {
      "title": "Кол-во созданных объектов",
      "code": "class O { static int count; O(){ count++; } }\npublic class Main { public static void main(String[] args){ new O(); new O(); new O(); System.out.println(O.count); }}",
      "output": "3",
      "explanation": "Готовый к запуску пример: Кол-во созданных объектов."
    },
    {
      "title": "main как статический",
      "code": "public class Main {\n  static String hello(){ return \"привет\"; }\n  public static void main(String[] args){ System.out.println(hello()); }\n}",
      "output": "привет",
      "explanation": "Готовый к запуску пример: main как статический."
    }
  ],
  "21": [
    {
      "title": "private + getter",
      "code": "class Account {\n  private double bal;\n  public void deposit(double x){ if (x > 0) bal += x; }\n  public double getBalance(){ return bal; }\n}\npublic class Main { public static void main(String[] args){\n  Account a = new Account();\n  a.deposit(100); a.deposit(-50); a.deposit(20);\n  System.out.println(a.getBalance());\n}}",
      "output": "120.0",
      "explanation": "Готовый к запуску пример: private + getter."
    },
    {
      "title": "Валидация в сеттере",
      "code": "class Person { private int age; public void setAge(int a){ if (a >= 0 && a < 150) age = a; } public int getAge(){ return age; } }\npublic class Main { public static void main(String[] args){ Person p = new Person(); p.setAge(-1); p.setAge(30); System.out.println(p.getAge()); }}",
      "output": "30",
      "explanation": "Готовый к запуску пример: Валидация в сеттере."
    },
    {
      "title": "Read-only поле",
      "code": "class Id { private final int v; public Id(int v){ this.v=v; } public int get(){ return v; } }\npublic class Main { public static void main(String[] args){ System.out.println(new Id(42).get()); }}",
      "output": "42",
      "explanation": "Готовый к запуску пример: Read-only поле."
    },
    {
      "title": "Изменение через метод",
      "code": "class Box { private int n; public void inc(){ n++; } public int get(){ return n; } }\npublic class Main { public static void main(String[] args){ Box b=new Box(); b.inc(); b.inc(); System.out.println(b.get()); }}",
      "output": "2",
      "explanation": "Готовый к запуску пример: Изменение через метод."
    },
    {
      "title": "Скрытие реализации",
      "code": "class List1 { private int[] data = new int[10]; private int sz = 0;\n  public void add(int x){ data[sz++] = x; }\n  public int size(){ return sz; }\n}\npublic class Main { public static void main(String[] args){ List1 l=new List1(); l.add(5); l.add(10); System.out.println(l.size()); }}",
      "output": "2",
      "explanation": "Готовый к запуску пример: Скрытие реализации."
    },
    {
      "title": "Геттер + сеттер пары",
      "code": "class Pair { private int a, b; public void set(int a, int b){ this.a=a; this.b=b; } public int sum(){ return a+b; } }\npublic class Main { public static void main(String[] args){ Pair p=new Pair(); p.set(3,4); System.out.println(p.sum()); }}",
      "output": "7",
      "explanation": "Готовый к запуску пример: Геттер + сеттер пары."
    },
    {
      "title": "Скрытое состояние",
      "code": "class Timer { private long start = System.nanoTime(); public long elapsed(){ return System.nanoTime() - start; } }\npublic class Main { public static void main(String[] args){ Timer t=new Timer(); for(int i=0;i<1000;i++); System.out.println(t.elapsed() > 0); }}",
      "output": "true",
      "explanation": "Готовый к запуску пример: Скрытое состояние."
    },
    {
      "title": "Поле как объект",
      "code": "class User { private String name; public User(String n){ name=n; } public String getName(){ return name; } }\npublic class Main { public static void main(String[] args){ System.out.println(new User(\"Аня\").getName()); }}",
      "output": "Аня",
      "explanation": "Готовый к запуску пример: Поле как объект."
    },
    {
      "title": "Конст. — снаружи только через геттер",
      "code": "class Cfg { private static final int MAX = 100; public static int max(){ return MAX; } }\npublic class Main { public static void main(String[] args){ System.out.println(Cfg.max()); }}",
      "output": "100",
      "explanation": "Готовый к запуску пример: Конст. — снаружи только через геттер."
    },
    {
      "title": "Withdraw + проверка",
      "code": "class Acc { private double bal = 100; public boolean withdraw(double x){ if (x>0 && x<=bal){ bal-=x; return true; } return false; } public double getBalance(){ return bal; } }\npublic class Main { public static void main(String[] args){ Acc a=new Acc(); System.out.println(a.withdraw(50)+\" \"+a.getBalance()); }}",
      "output": "true 50.0",
      "explanation": "Готовый к запуску пример: Withdraw + проверка."
    }
  ],
  "22": [
    {
      "title": "extends",
      "code": "class Animal { void eat(){ System.out.println(\"ем\"); } }\nclass Cat extends Animal { void meow(){ System.out.println(\"мяу\"); } }\npublic class Main { public static void main(String[] args){ Cat c=new Cat(); c.eat(); c.meow(); }}",
      "output": "ем\nмяу",
      "explanation": "Готовый к запуску пример: extends."
    },
    {
      "title": "super()",
      "code": "class A { A(){ System.out.println(\"A\"); } }\nclass B extends A { B(){ super(); System.out.println(\"B\"); } }\npublic class Main { public static void main(String[] args){ new B(); }}",
      "output": "A\nB",
      "explanation": "Готовый к запуску пример: super()."
    },
    {
      "title": "Поля родителя",
      "code": "class Animal { String name; }\nclass Dog extends Animal { void bark(){ System.out.println(name + \": гав\"); } }\npublic class Main { public static void main(String[] args){ Dog d=new Dog(); d.name=\"Рекс\"; d.bark(); }}",
      "output": "Рекс: гав",
      "explanation": "Готовый к запуску пример: Поля родителя."
    },
    {
      "title": "Метод родителя в потомке",
      "code": "class Vehicle { void start(){ System.out.println(\"едет\"); } }\nclass Car extends Vehicle {}\npublic class Main { public static void main(String[] args){ new Car().start(); }}",
      "output": "едет",
      "explanation": "Готовый к запуску пример: Метод родителя в потомке."
    },
    {
      "title": "3 уровня",
      "code": "class A { void x(){ System.out.println(\"A.x\"); } }\nclass B extends A {}\nclass C extends B {}\npublic class Main { public static void main(String[] args){ new C().x(); }}",
      "output": "A.x",
      "explanation": "Готовый к запуску пример: 3 уровня."
    },
    {
      "title": "Свои + унаследованные",
      "code": "class Animal { void eat(){ System.out.println(\"ест\"); } }\nclass Fish extends Animal { void swim(){ System.out.println(\"плывёт\"); } }\npublic class Main { public static void main(String[] args){ Fish f=new Fish(); f.eat(); f.swim(); }}",
      "output": "ест\nплывёт",
      "explanation": "Готовый к запуску пример: Свои + унаследованные."
    },
    {
      "title": "super в конструкторе",
      "code": "class A { int x; A(int x){ this.x = x; } }\nclass B extends A { int y; B(int x, int y){ super(x); this.y = y; } }\npublic class Main { public static void main(String[] args){ B b = new B(3,4); System.out.println(b.x + \" \" + b.y); }}",
      "output": "3 4",
      "explanation": "Готовый к запуску пример: super в конструкторе."
    },
    {
      "title": "instanceof",
      "code": "class A{} class B extends A{}\npublic class Main { public static void main(String[] args){ A a = new B(); System.out.println(a instanceof B); }}",
      "output": "true",
      "explanation": "Готовый к запуску пример: instanceof."
    },
    {
      "title": "Каст",
      "code": "class Animal { void eat(){} }\nclass Dog extends Animal { void bark(){ System.out.println(\"гав\"); } }\npublic class Main { public static void main(String[] args){ Animal a = new Dog(); ((Dog)a).bark(); }}",
      "output": "гав",
      "explanation": "Готовый к запуску пример: Каст."
    },
    {
      "title": "Object.toString",
      "code": "class Pt { int x, y; Pt(int x, int y){ this.x=x; this.y=y; } @Override public String toString(){ return \"(\"+x+\",\"+y+\")\"; } }\npublic class Main { public static void main(String[] args){ System.out.println(new Pt(3,4)); }}",
      "output": "(3,4)",
      "explanation": "Готовый к запуску пример: Object.toString."
    }
  ],
  "23": [
    {
      "title": "@Override",
      "code": "class A { void s(){ System.out.println(\"A\"); } }\nclass B extends A { @Override void s(){ System.out.println(\"B\"); } }\npublic class Main { public static void main(String[] args){ A a = new B(); a.s(); }}",
      "output": "B",
      "explanation": "Готовый к запуску пример: @Override."
    },
    {
      "title": "Звуки животных",
      "code": "class Animal { void sound(){ System.out.println(\"?\"); } }\nclass Dog extends Animal { @Override void sound(){ System.out.println(\"Гав\"); } }\nclass Cat extends Animal { @Override void sound(){ System.out.println(\"Мяу\"); } }\npublic class Main { public static void main(String[] args){\n  Animal[] a = { new Dog(), new Cat() };\n  for (Animal x : a) x.sound();\n}}",
      "output": "Гав\nМяу",
      "explanation": "Готовый к запуску пример: Звуки животных."
    },
    {
      "title": "super.method()",
      "code": "class A { void greet(){ System.out.println(\"hello\"); } }\nclass B extends A { @Override void greet(){ super.greet(); System.out.println(\"world\"); } }\npublic class Main { public static void main(String[] args){ new B().greet(); }}",
      "output": "hello\nworld",
      "explanation": "Готовый к запуску пример: super.method()."
    },
    {
      "title": "Полиморфизм в списке",
      "code": "class Animal { String sound(){ return \"?\"; } }\nclass Dog extends Animal { @Override String sound(){ return \"гав\"; } }\nclass Cow extends Animal { @Override String sound(){ return \"му\"; } }\npublic class Main { public static void main(String[] args){\n  java.util.List<Animal> l = java.util.List.of(new Dog(), new Cow());\n  for (Animal x : l) System.out.println(x.sound());\n}}",
      "output": "гав\nму",
      "explanation": "Готовый к запуску пример: Полиморфизм в списке."
    },
    {
      "title": "Метод как поле родителя",
      "code": "class Shape { double area(){ return 0; } }\nclass Square extends Shape { double s; Square(double s){ this.s=s; } @Override double area(){ return s*s; } }\npublic class Main { public static void main(String[] args){ Shape sh = new Square(5); System.out.println(sh.area()); }}",
      "output": "25.0",
      "explanation": "Готовый к запуску пример: Метод как поле родителя."
    },
    {
      "title": "Перегрузка vs переопред.",
      "code": "class A { int f(int x){ return x; } }\nclass B extends A { @Override int f(int x){ return x*2; } }\npublic class Main { public static void main(String[] args){ A a = new B(); System.out.println(a.f(5)); }}",
      "output": "10",
      "explanation": "Готовый к запуску пример: Перегрузка vs переопред.."
    },
    {
      "title": "Динамический выбор метода",
      "code": "class Pay { void pay(){ System.out.println(\"deflt\"); } }\nclass Card extends Pay { @Override void pay(){ System.out.println(\"card\"); } }\nclass Cash extends Pay { @Override void pay(){ System.out.println(\"cash\"); } }\npublic class Main { public static void main(String[] args){ Pay[] m = { new Card(), new Cash() }; for (Pay p : m) p.pay(); }}",
      "output": "card\ncash",
      "explanation": "Готовый к запуску пример: Динамический выбор метода."
    },
    {
      "title": "toString",
      "code": "class P { int x, y; P(int x, int y){ this.x=x; this.y=y; } @Override public String toString(){ return x+\",\"+y; } }\npublic class Main { public static void main(String[] args){ Object o = new P(3,4); System.out.println(o); }}",
      "output": "3,4",
      "explanation": "Готовый к запуску пример: toString."
    },
    {
      "title": "equals переопределение",
      "code": "class N { int v; N(int v){ this.v=v; } @Override public boolean equals(Object o){ return o instanceof N && ((N)o).v == v; } }\npublic class Main { public static void main(String[] args){ System.out.println(new N(5).equals(new N(5))); }}",
      "output": "true",
      "explanation": "Готовый к запуску пример: equals переопределение."
    },
    {
      "title": "instanceof + pattern (Java 16+)",
      "code": "class A {} class B extends A { void hi(){ System.out.println(\"B\"); } }\npublic class Main { public static void main(String[] args){ A a = new B(); if (a instanceof B b) b.hi(); }}",
      "output": "B",
      "explanation": "Готовый к запуску пример: instanceof + pattern (Java 16+)."
    }
  ],
  "24": [
    {
      "title": "abstract метод",
      "code": "abstract class Shape { abstract double area(); }\nclass Circle extends Shape { double r; Circle(double r){ this.r=r; } double area(){ return Math.PI*r*r; } }\npublic class Main { public static void main(String[] args){ Shape s = new Circle(2); System.out.println(s.area()); }}",
      "output": "12.566370614359172",
      "explanation": "Готовый к запуску пример: abstract метод."
    },
    {
      "title": "abstract + конкретный",
      "code": "abstract class A { void hi(){ System.out.println(\"hi\"); } abstract void bye(); }\nclass B extends A { void bye(){ System.out.println(\"bye\"); } }\npublic class Main { public static void main(String[] args){ A a = new B(); a.hi(); a.bye(); }}",
      "output": "hi\nbye",
      "explanation": "Готовый к запуску пример: abstract + конкретный."
    },
    {
      "title": "Полиморфизм через abstract",
      "code": "abstract class Pay { abstract void pay(); }\nclass Card extends Pay { void pay(){ System.out.println(\"card\"); } }\nclass Cash extends Pay { void pay(){ System.out.println(\"cash\"); } }\npublic class Main { public static void main(String[] args){ Pay[] p={new Card(),new Cash()}; for (Pay x : p) x.pay(); }}",
      "output": "card\ncash",
      "explanation": "Готовый к запуску пример: Полиморфизм через abstract."
    },
    {
      "title": "Square и Rect",
      "code": "abstract class Shape { abstract double area(); }\nclass Square extends Shape { double s; Square(double s){ this.s=s; } double area(){ return s*s; } }\nclass Rect extends Shape { double w,h; Rect(double w,double h){this.w=w;this.h=h;} double area(){ return w*h; } }\npublic class Main { public static void main(String[] args){ System.out.println(new Square(3).area() + \" \" + new Rect(2,5).area()); }}",
      "output": "9.0 10.0",
      "explanation": "Готовый к запуску пример: Square и Rect."
    },
    {
      "title": "Список форм",
      "code": "abstract class Sh { abstract double area(); }\nclass C extends Sh { double r; C(double r){this.r=r;} double area(){ return Math.PI*r*r; } }\nclass S extends Sh { double s; S(double s){this.s=s;} double area(){ return s*s; } }\npublic class Main { public static void main(String[] args){ Sh[] a={new C(1),new S(2)}; double t=0; for(Sh x:a) t+=x.area(); System.out.printf(\"%.2f%n\", t); }}",
      "output": "7,14",
      "explanation": "Готовый к запуску пример: Список форм."
    },
    {
      "title": "abstract + поле",
      "code": "abstract class Animal { String name; Animal(String n){name=n;} abstract String sound(); }\nclass Dog extends Animal { Dog(String n){super(n);} String sound(){ return name+\":гав\"; } }\npublic class Main { public static void main(String[] args){ System.out.println(new Dog(\"Рекс\").sound()); }}",
      "output": "Рекс:гав",
      "explanation": "Готовый к запуску пример: abstract + поле."
    },
    {
      "title": "abstract в utility-шаблоне",
      "code": "abstract class Greet { void greet(){ System.out.println(\"Hi, \" + name()); } abstract String name(); }\nclass User extends Greet { String name(){ return \"Аня\"; } }\npublic class Main { public static void main(String[] args){ new User().greet(); }}",
      "output": "Hi, Аня",
      "explanation": "Готовый к запуску пример: abstract в utility-шаблоне."
    },
    {
      "title": "Counter",
      "code": "abstract class Counter { int n; abstract int step(); void inc(){ n += step(); } }\nclass C extends Counter { int step(){ return 2; } }\npublic class Main { public static void main(String[] args){ C c=new C(); c.inc(); c.inc(); c.inc(); System.out.println(c.n); }}",
      "output": "6",
      "explanation": "Готовый к запуску пример: Counter."
    },
    {
      "title": "Многоступенчатая иерархия",
      "code": "abstract class A { abstract void f(); }\nabstract class B extends A { void f(){ g(); } abstract void g(); }\nclass C extends B { void g(){ System.out.println(\"g\"); } }\npublic class Main { public static void main(String[] args){ new C().f(); }}",
      "output": "g",
      "explanation": "Готовый к запуску пример: Многоступенчатая иерархия."
    },
    {
      "title": "Нельзя создать abstract",
      "code": "abstract class A {}\npublic class Main { public static void main(String[] args){ System.out.println(\"abstract нельзя создать через new A();\"); }}",
      "output": "abstract нельзя создать через new A();",
      "explanation": "Готовый к запуску пример: Нельзя создать abstract."
    }
  ],
  "25": [
    {
      "title": "implements",
      "code": "interface Flyable { void fly(); }\nclass Bird implements Flyable { public void fly(){ System.out.println(\"Летит!\"); } }\npublic class Main { public static void main(String[] args){ new Bird().fly(); }}",
      "output": "Летит!",
      "explanation": "Готовый к запуску пример: implements."
    },
    {
      "title": "Несколько интерфейсов",
      "code": "interface A { void a(); }\ninterface B { void b(); }\nclass T implements A, B { public void a(){ System.out.println(\"a\"); } public void b(){ System.out.println(\"b\"); } }\npublic class Main { public static void main(String[] args){ T t=new T(); t.a(); t.b(); }}",
      "output": "a\nb",
      "explanation": "Готовый к запуску пример: Несколько интерфейсов."
    },
    {
      "title": "default метод",
      "code": "interface G { default void greet(){ System.out.println(\"Привет\"); } }\nclass U implements G {}\npublic class Main { public static void main(String[] args){ new U().greet(); }}",
      "output": "Привет",
      "explanation": "Готовый к запуску пример: default метод."
    },
    {
      "title": "static метод интерфейса",
      "code": "interface M { static int sqr(int x){ return x*x; } }\npublic class Main { public static void main(String[] args){ System.out.println(M.sqr(8)); }}",
      "output": "64",
      "explanation": "Готовый к запуску пример: static метод интерфейса."
    },
    {
      "title": "Несколько реализаций",
      "code": "interface Pay { void pay(); }\nclass Card implements Pay { public void pay(){ System.out.println(\"card\"); } }\nclass Cash implements Pay { public void pay(){ System.out.println(\"cash\"); } }\npublic class Main { public static void main(String[] args){ Pay[] p={new Card(),new Cash()}; for(Pay x:p) x.pay(); }}",
      "output": "card\ncash",
      "explanation": "Готовый к запуску пример: Несколько реализаций."
    },
    {
      "title": "Constant в interface",
      "code": "interface PI { double VAL = 3.14159; }\npublic class Main { public static void main(String[] args){ System.out.println(PI.VAL); }}",
      "output": "3.14159",
      "explanation": "Готовый к запуску пример: Constant в interface."
    },
    {
      "title": "Comparable",
      "code": "import java.util.*;\nclass P implements Comparable<P> { int v; P(int v){this.v=v;} public int compareTo(P o){ return v-o.v; } public String toString(){ return \"\"+v; } }\npublic class Main { public static void main(String[] args){ List<P> l=new ArrayList<>(List.of(new P(3),new P(1),new P(2))); Collections.sort(l); System.out.println(l); }}",
      "output": "[1, 2, 3]",
      "explanation": "Готовый к запуску пример: Comparable."
    },
    {
      "title": "Runnable",
      "code": "public class Main { public static void main(String[] args){ Runnable r = () -> System.out.println(\"run\"); r.run(); }}",
      "output": "run",
      "explanation": "Готовый к запуску пример: Runnable."
    },
    {
      "title": "Интерфейс наследует интерфейс",
      "code": "interface A { void a(); }\ninterface B extends A { void b(); }\nclass C implements B { public void a(){ System.out.println(\"a\"); } public void b(){ System.out.println(\"b\"); } }\npublic class Main { public static void main(String[] args){ C c=new C(); c.a(); c.b(); }}",
      "output": "a\nb",
      "explanation": "Готовый к запуску пример: Интерфейс наследует интерфейс."
    },
    {
      "title": "Lambda как реализация",
      "code": "interface F { int apply(int x); }\npublic class Main { public static void main(String[] args){ F sqr = x -> x*x; System.out.println(sqr.apply(5)); }}",
      "output": "25",
      "explanation": "Готовый к запуску пример: Lambda как реализация."
    }
  ],
  "26": [
    {
      "title": "import Scanner",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  // Scanner sc = new Scanner(System.in);\n  System.out.println(Scanner.class.getName());\n}}",
      "output": "java.util.Scanner",
      "explanation": "Готовый к запуску пример: import Scanner."
    },
    {
      "title": "import *",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  List<Integer> l = new ArrayList<>(List.of(1,2,3));\n  System.out.println(l);\n}}",
      "output": "[1, 2, 3]",
      "explanation": "Готовый к запуску пример: import *."
    },
    {
      "title": "java.lang без import",
      "code": "public class Main { public static void main(String[] args){ System.out.println(Math.abs(-5)); }}",
      "output": "5",
      "explanation": "Готовый к запуску пример: java.lang без import."
    },
    {
      "title": "Файлы",
      "code": "import java.nio.file.*;\npublic class Main { public static void main(String[] args){ System.out.println(Path.of(\"a/b.txt\")); }}",
      "output": "a/b.txt",
      "explanation": "Готовый к запуску пример: Файлы."
    },
    {
      "title": "Полное имя без import",
      "code": "public class Main { public static void main(String[] args){ java.util.Random r = new java.util.Random(42); System.out.println(r.nextInt(100)); }}",
      "output": "63 (детерм. от seed)",
      "explanation": "Готовый к запуску пример: Полное имя без import."
    },
    {
      "title": "Класс LocalDate",
      "code": "import java.time.LocalDate;\npublic class Main { public static void main(String[] args){ System.out.println(LocalDate.of(2026, 5, 23)); }}",
      "output": "2026-05-23",
      "explanation": "Готовый к запуску пример: Класс LocalDate."
    },
    {
      "title": "Static import",
      "code": "import static java.lang.Math.*;\npublic class Main { public static void main(String[] args){ System.out.println(sqrt(81) + \" / \" + PI); }}",
      "output": "9.0 / 3.141592653589793",
      "explanation": "Готовый к запуску пример: Static import."
    },
    {
      "title": "UUID",
      "code": "import java.util.UUID;\npublic class Main { public static void main(String[] args){ System.out.println(UUID.nameUUIDFromBytes(\"java\".getBytes())); }}",
      "output": "напр. d1...5",
      "explanation": "Готовый к запуску пример: UUID."
    },
    {
      "title": "Imports collections",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  Map<String,Integer> m = new HashMap<>();\n  m.put(\"a\", 1);\n  System.out.println(m);\n}}",
      "output": "{a=1}",
      "explanation": "Готовый к запуску пример: Imports collections."
    },
    {
      "title": "Pattern",
      "code": "import java.util.regex.*;\npublic class Main { public static void main(String[] args){ System.out.println(Pattern.matches(\"\\\\d+\", \"123\")); }}",
      "output": "true",
      "explanation": "Готовый к запуску пример: Pattern."
    }
  ],
  "27": [
    {
      "title": "День недели",
      "code": "enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }\npublic class Main { public static void main(String[] args){ Day d=Day.WED; if (d==Day.WED) System.out.println(\"Среда\"); }}",
      "output": "Среда",
      "explanation": "Готовый к запуску пример: День недели."
    },
    {
      "title": "values()",
      "code": "enum Color { RED, GREEN, BLUE }\npublic class Main { public static void main(String[] args){ for (Color c : Color.values()) System.out.println(c); }}",
      "output": "RED\nGREEN\nBLUE",
      "explanation": "Готовый к запуску пример: values()."
    },
    {
      "title": "ordinal()",
      "code": "enum L { LOW, MID, HIGH }\npublic class Main { public static void main(String[] args){ System.out.println(L.HIGH.ordinal()); }}",
      "output": "2",
      "explanation": "Готовый к запуску пример: ordinal()."
    },
    {
      "title": "name()",
      "code": "enum F { APPLE, BANANA }\npublic class Main { public static void main(String[] args){ System.out.println(F.APPLE.name()); }}",
      "output": "APPLE",
      "explanation": "Готовый к запуску пример: name()."
    },
    {
      "title": "switch по enum",
      "code": "enum St { OK, FAIL, WAIT }\npublic class Main { public static void main(String[] args){\n  St s = St.OK;\n  switch (s){ case OK -> System.out.println(\"всё ОК\"); case FAIL -> System.out.println(\"ошибка\"); case WAIT -> System.out.println(\"ждём\"); }\n}}",
      "output": "всё ОК",
      "explanation": "Готовый к запуску пример: switch по enum."
    },
    {
      "title": "valueOf",
      "code": "enum D { MON, TUE }\npublic class Main { public static void main(String[] args){ System.out.println(D.valueOf(\"MON\")); }}",
      "output": "MON",
      "explanation": "Готовый к запуску пример: valueOf."
    },
    {
      "title": "Enum с полем",
      "code": "enum Planet { EARTH(5.97), MARS(0.64); double mass; Planet(double m){ mass = m; } }\npublic class Main { public static void main(String[] args){ System.out.println(Planet.MARS.mass); }}",
      "output": "0.64",
      "explanation": "Готовый к запуску пример: Enum с полем."
    },
    {
      "title": "Enum с методом",
      "code": "enum Op { PLUS{ public int apply(int a, int b){ return a+b; } }, MINUS{ public int apply(int a, int b){ return a-b; } }; public abstract int apply(int a, int b); }\npublic class Main { public static void main(String[] args){ System.out.println(Op.PLUS.apply(2, 3)); }}",
      "output": "5",
      "explanation": "Готовый к запуску пример: Enum с методом."
    },
    {
      "title": "EnumSet",
      "code": "import java.util.EnumSet;\nenum D { MON, TUE, WED }\npublic class Main { public static void main(String[] args){ System.out.println(EnumSet.of(D.MON, D.WED)); }}",
      "output": "[MON, WED]",
      "explanation": "Готовый к запуску пример: EnumSet."
    },
    {
      "title": "Enum в коллекции",
      "code": "import java.util.*;\nenum C { A, B }\npublic class Main { public static void main(String[] args){ List<C> l = List.of(C.A, C.B, C.A); System.out.println(l); }}",
      "output": "[A, B, A]",
      "explanation": "Готовый к запуску пример: Enum в коллекции."
    }
  ],
  "28": [
    {
      "title": "try / catch",
      "code": "try { int x = Integer.parseInt(\"abc\"); }\ncatch (NumberFormatException e){ System.out.println(\"не число: \" + e.getMessage()); }",
      "output": "не число: For input string: \"abc\"",
      "explanation": "Готовый к запуску пример: try / catch."
    },
    {
      "title": "finally",
      "code": "try { System.out.println(\"try\"); }\ncatch (Exception e){ System.out.println(\"catch\"); }\nfinally { System.out.println(\"finally\"); }",
      "output": "try\nfinally",
      "explanation": "Готовый к запуску пример: finally."
    },
    {
      "title": "ArrayIndexOutOfBounds",
      "code": "int[] a = {1,2,3};\ntry { System.out.println(a[10]); }\ncatch (ArrayIndexOutOfBoundsException e){ System.out.println(\"индекс вне границ\"); }",
      "output": "индекс вне границ",
      "explanation": "Готовый к запуску пример: ArrayIndexOutOfBounds."
    },
    {
      "title": "NullPointer",
      "code": "String s = null;\ntry { System.out.println(s.length()); }\ncatch (NullPointerException e){ System.out.println(\"null!\"); }",
      "output": "null!",
      "explanation": "Готовый к запуску пример: NullPointer."
    },
    {
      "title": "ArithmeticException",
      "code": "try { int x = 5 / 0; }\ncatch (ArithmeticException e){ System.out.println(\"делить на 0 нельзя\"); }",
      "output": "делить на 0 нельзя",
      "explanation": "Готовый к запуску пример: ArithmeticException."
    },
    {
      "title": "throw",
      "code": "public class Main { public static void main(String[] args){\n  try { throw new RuntimeException(\"бум\"); }\n  catch (RuntimeException e){ System.out.println(e.getMessage()); }\n}}",
      "output": "бум",
      "explanation": "Готовый к запуску пример: throw."
    },
    {
      "title": "throws + try",
      "code": "public class Main {\n  static void load() throws Exception { throw new Exception(\"нет файла\"); }\n  public static void main(String[] args){ try { load(); } catch (Exception e){ System.out.println(e.getMessage()); } }\n}",
      "output": "нет файла",
      "explanation": "Готовый к запуску пример: throws + try."
    },
    {
      "title": "Несколько catch",
      "code": "try { Integer.parseInt(\"abc\"); }\ncatch (NumberFormatException e){ System.out.println(\"NFE\"); }\ncatch (Exception e){ System.out.println(\"other\"); }",
      "output": "NFE",
      "explanation": "Готовый к запуску пример: Несколько catch."
    },
    {
      "title": "Multi-catch",
      "code": "try { Object o = null; o.toString(); }\ncatch (NullPointerException | IllegalArgumentException e){ System.out.println(\"oops\"); }",
      "output": "oops",
      "explanation": "Готовый к запуску пример: Multi-catch."
    },
    {
      "title": "try-with-resources",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  try (Scanner sc = new Scanner(\"42\")){ System.out.println(sc.nextInt()); }\n}}",
      "output": "42",
      "explanation": "Готовый к запуску пример: try-with-resources."
    }
  ],
  "29": [
    {
      "title": "RuntimeException",
      "code": "class TooYoungException extends RuntimeException { public TooYoungException(String m){ super(m); } }\npublic class Main {\n  static void check(int a){ if (a < 18) throw new TooYoungException(\"18+\"); }\n  public static void main(String[] args){ try { check(10); } catch (TooYoungException e){ System.out.println(e.getMessage()); } }\n}",
      "output": "18+",
      "explanation": "Готовый к запуску пример: RuntimeException."
    },
    {
      "title": "Checked Exception",
      "code": "class BadInput extends Exception { public BadInput(String m){ super(m); } }\npublic class Main {\n  static void parse(String s) throws BadInput { if (s.isEmpty()) throw new BadInput(\"пусто\"); }\n  public static void main(String[] args){ try { parse(\"\"); } catch (BadInput e){ System.out.println(e.getMessage()); } }\n}",
      "output": "пусто",
      "explanation": "Готовый к запуску пример: Checked Exception."
    },
    {
      "title": "Своё с полем",
      "code": "class NoFundsException extends RuntimeException { double amount; NoFundsException(double a){ super(\"нет средств\"); amount=a; } }\npublic class Main { public static void main(String[] args){ try { throw new NoFundsException(100); } catch (NoFundsException e){ System.out.println(e.amount); } }}",
      "output": "100.0",
      "explanation": "Готовый к запуску пример: Своё с полем."
    },
    {
      "title": "throws в сигнатуре",
      "code": "class AppEx extends Exception { AppEx(String m){ super(m); } }\npublic class Main {\n  static void run() throws AppEx { throw new AppEx(\"err\"); }\n  public static void main(String[] args){ try { run(); } catch (AppEx e){ System.out.println(e.getMessage()); } }\n}",
      "output": "err",
      "explanation": "Готовый к запуску пример: throws в сигнатуре."
    },
    {
      "title": "Stack trace",
      "code": "class MyEx extends RuntimeException { MyEx(String m){ super(m); } }\npublic class Main { public static void main(String[] args){ try { throw new MyEx(\"boom\"); } catch (MyEx e){ System.out.println(e.getClass().getSimpleName()); } }}",
      "output": "MyEx",
      "explanation": "Готовый к запуску пример: Stack trace."
    },
    {
      "title": "Цепочка причин",
      "code": "class A extends RuntimeException { A(String m, Throwable c){ super(m, c); } }\npublic class Main { public static void main(String[] args){ try { throw new A(\"wrap\", new ArithmeticException(\"div\")); } catch (A e){ System.out.println(e.getCause().getMessage()); } }}",
      "output": "div",
      "explanation": "Готовый к запуску пример: Цепочка причин."
    },
    {
      "title": "Иерархия",
      "code": "class BaseEx extends RuntimeException { BaseEx(String m){ super(m); } }\nclass SubEx extends BaseEx { SubEx(String m){ super(m); } }\npublic class Main { public static void main(String[] args){ try { throw new SubEx(\"x\"); } catch (BaseEx e){ System.out.println(\"поймали родителем\"); } }}",
      "output": "поймали родителем",
      "explanation": "Готовый к запуску пример: Иерархия."
    },
    {
      "title": "Метод с проверкой",
      "code": "class OutOfRange extends RuntimeException { OutOfRange(String m){ super(m); } }\npublic class Main {\n  static int get(int[] a, int i){ if (i<0 || i>=a.length) throw new OutOfRange(\"i=\"+i); return a[i]; }\n  public static void main(String[] args){ try { get(new int[]{1,2}, 5); } catch (OutOfRange e){ System.out.println(e.getMessage()); } }\n}",
      "output": "i=5",
      "explanation": "Готовый к запуску пример: Метод с проверкой."
    },
    {
      "title": "Бросаем из конструктора",
      "code": "class Age { int a; Age(int a){ if (a < 0) throw new IllegalArgumentException(\"negative\"); this.a=a; } }\npublic class Main { public static void main(String[] args){ try { new Age(-1); } catch (IllegalArgumentException e){ System.out.println(e.getMessage()); } }}",
      "output": "negative",
      "explanation": "Готовый к запуску пример: Бросаем из конструктора."
    },
    {
      "title": "Логирование при пере-throw",
      "code": "class E extends RuntimeException { E(String m){ super(m); } }\npublic class Main { public static void main(String[] args){\n  try { try { throw new E(\"inner\"); } catch (E e){ System.out.println(\"лог: \" + e.getMessage()); throw e; } }\n  catch (E e){ System.out.println(\"финал: \" + e.getMessage()); }\n}}",
      "output": "лог: inner\nфинал: inner",
      "explanation": "Готовый к запуску пример: Логирование при пере-throw."
    }
  ],
  "30": [
    {
      "title": "Чтение строки",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  Scanner sc = new Scanner(\"Привет\\n\");\n  System.out.println(sc.nextLine());\n  sc.close();\n}}",
      "output": "Привет",
      "explanation": "Готовый к запуску пример: Чтение строки."
    },
    {
      "title": "Чтение числа",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  Scanner sc = new Scanner(\"42\");\n  System.out.println(sc.nextInt());\n  sc.close();\n}}",
      "output": "42",
      "explanation": "Готовый к запуску пример: Чтение числа."
    },
    {
      "title": "Два значения",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  Scanner sc = new Scanner(\"5 7\");\n  int a = sc.nextInt(), b = sc.nextInt();\n  System.out.println(a + b);\n  sc.close();\n}}",
      "output": "12",
      "explanation": "Готовый к запуску пример: Два значения."
    },
    {
      "title": "Чтение double",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  Scanner sc = new Scanner(\"3,14\");\n  sc.useLocale(java.util.Locale.forLanguageTag(\"ru\"));\n  System.out.println(sc.nextDouble());\n  sc.close();\n}}",
      "output": "3.14",
      "explanation": "Готовый к запуску пример: Чтение double."
    },
    {
      "title": "hasNextInt",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  Scanner sc = new Scanner(\"1 2 hello\");\n  int s = 0; while (sc.hasNextInt()) s += sc.nextInt();\n  System.out.println(s);\n  sc.close();\n}}",
      "output": "3",
      "explanation": "Готовый к запуску пример: hasNextInt."
    },
    {
      "title": "Чтение через консоль (демо)",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  Scanner sc = new Scanner(System.in);\n  // В IDE введите имя:\n  // String name = sc.nextLine();\n  System.out.println(\"Готов читать с консоли\");\n  sc.close();\n}}",
      "output": "Готов читать с консоли",
      "explanation": "Готовый к запуску пример: Чтение через консоль (демо)."
    },
    {
      "title": "Подсчёт чисел",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  Scanner sc = new Scanner(\"1 2 3 4 5\");\n  int n = 0;\n  while (sc.hasNextInt()){ sc.nextInt(); n++; }\n  System.out.println(n);\n  sc.close();\n}}",
      "output": "5",
      "explanation": "Готовый к запуску пример: Подсчёт чисел."
    },
    {
      "title": "Чтение слов",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  Scanner sc = new Scanner(\"раз два три\");\n  while (sc.hasNext()) System.out.println(sc.next());\n  sc.close();\n}}",
      "output": "раз\nдва\nтри",
      "explanation": "Готовый к запуску пример: Чтение слов."
    },
    {
      "title": "nextLine после nextInt",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  Scanner sc = new Scanner(\"7\\nПривет\");\n  int n = sc.nextInt(); sc.nextLine();\n  String s = sc.nextLine();\n  System.out.println(n + \" / \" + s);\n  sc.close();\n}}",
      "output": "7 / Привет",
      "explanation": "Готовый к запуску пример: nextLine после nextInt."
    },
    {
      "title": "Сумма списка через цикл",
      "code": "import java.util.Scanner;\npublic class Main { public static void main(String[] args){\n  Scanner sc = new Scanner(\"10 20 30\");\n  int s = 0; while (sc.hasNextInt()) s += sc.nextInt();\n  System.out.println(s);\n  sc.close();\n}}",
      "output": "60",
      "explanation": "Готовый к запуску пример: Сумма списка через цикл."
    }
  ],
  "31": [
    {
      "title": "Запись",
      "code": "import java.nio.file.*;\nimport java.io.IOException;\npublic class Main { public static void main(String[] args) throws IOException {\n  Files.writeString(Path.of(\"data.txt\"), \"Привет!\");\n  System.out.println(\"OK\");\n}}",
      "output": "OK (создан файл data.txt)",
      "explanation": "Готовый к запуску пример: Запись."
    },
    {
      "title": "Чтение",
      "code": "import java.nio.file.*;\nimport java.io.IOException;\npublic class Main { public static void main(String[] args) throws IOException {\n  Files.writeString(Path.of(\"data.txt\"), \"Hello\");\n  System.out.println(Files.readString(Path.of(\"data.txt\")));\n}}",
      "output": "Hello",
      "explanation": "Готовый к запуску пример: Чтение."
    },
    {
      "title": "По строкам",
      "code": "import java.nio.file.*;\nimport java.util.List;\nimport java.io.IOException;\npublic class Main { public static void main(String[] args) throws IOException {\n  Files.write(Path.of(\"a.txt\"), List.of(\"один\",\"два\"));\n  for (String l : Files.readAllLines(Path.of(\"a.txt\"))) System.out.println(l);\n}}",
      "output": "один\nдва",
      "explanation": "Готовый к запуску пример: По строкам."
    },
    {
      "title": "Существует ли",
      "code": "import java.nio.file.*;\npublic class Main { public static void main(String[] args){ System.out.println(Files.exists(Path.of(\"unknown.txt\"))); }}",
      "output": "false",
      "explanation": "Готовый к запуску пример: Существует ли."
    },
    {
      "title": "Размер",
      "code": "import java.nio.file.*;\nimport java.io.IOException;\npublic class Main { public static void main(String[] args) throws IOException {\n  Files.writeString(Path.of(\"a.txt\"), \"12345\");\n  System.out.println(Files.size(Path.of(\"a.txt\")));\n}}",
      "output": "5",
      "explanation": "Готовый к запуску пример: Размер."
    },
    {
      "title": "Удалить",
      "code": "import java.nio.file.*;\nimport java.io.IOException;\npublic class Main { public static void main(String[] args) throws IOException {\n  Files.writeString(Path.of(\"tmp.txt\"), \"x\");\n  Files.delete(Path.of(\"tmp.txt\"));\n  System.out.println(Files.exists(Path.of(\"tmp.txt\")));\n}}",
      "output": "false",
      "explanation": "Готовый к запуску пример: Удалить."
    },
    {
      "title": "Дозапись",
      "code": "import java.nio.file.*;\nimport java.io.IOException;\npublic class Main { public static void main(String[] args) throws IOException {\n  Files.writeString(Path.of(\"log.txt\"), \"A\");\n  Files.writeString(Path.of(\"log.txt\"), \"B\", StandardOpenOption.APPEND);\n  System.out.println(Files.readString(Path.of(\"log.txt\")));\n}}",
      "output": "AB",
      "explanation": "Готовый к запуску пример: Дозапись."
    },
    {
      "title": "Копировать",
      "code": "import java.nio.file.*;\nimport java.io.IOException;\npublic class Main { public static void main(String[] args) throws IOException {\n  Files.writeString(Path.of(\"a.txt\"), \"hi\");\n  Files.copy(Path.of(\"a.txt\"), Path.of(\"b.txt\"), StandardCopyOption.REPLACE_EXISTING);\n  System.out.println(Files.readString(Path.of(\"b.txt\")));\n}}",
      "output": "hi",
      "explanation": "Готовый к запуску пример: Копировать."
    },
    {
      "title": "Список файлов",
      "code": "import java.nio.file.*;\nimport java.io.IOException;\nimport java.util.stream.*;\npublic class Main { public static void main(String[] args) throws IOException {\n  try (Stream<Path> s = Files.list(Path.of(\".\"))){\n    s.limit(3).forEach(System.out::println);\n  }\n}}",
      "output": "(до 3 файлов из текущей папки)",
      "explanation": "Готовый к запуску пример: Список файлов."
    },
    {
      "title": "Создать каталог",
      "code": "import java.nio.file.*;\nimport java.io.IOException;\npublic class Main { public static void main(String[] args) throws IOException {\n  Files.createDirectories(Path.of(\"my/sub\"));\n  System.out.println(Files.exists(Path.of(\"my/sub\")));\n}}",
      "output": "true",
      "explanation": "Готовый к запуску пример: Создать каталог."
    }
  ],
  "32": [
    {
      "title": "Box<T>",
      "code": "class Box<T> { T v; void set(T v){ this.v=v; } T get(){ return v; } }\npublic class Main { public static void main(String[] args){ Box<String> b=new Box<>(); b.set(\"hi\"); System.out.println(b.get()); }}",
      "output": "hi",
      "explanation": "Готовый к запуску пример: Box<T>."
    },
    {
      "title": "Pair<A,B>",
      "code": "class Pair<A,B> { A a; B b; Pair(A a, B b){this.a=a;this.b=b;} public String toString(){ return a+\"/\"+b; } }\npublic class Main { public static void main(String[] args){ System.out.println(new Pair<>(\"Аня\", 12)); }}",
      "output": "Аня/12",
      "explanation": "Готовый к запуску пример: Pair<A,B>."
    },
    {
      "title": "Generic метод",
      "code": "public class Main { static <T> T first(java.util.List<T> l){ return l.get(0); } public static void main(String[] args){ System.out.println(first(java.util.List.of(7,8,9))); }}",
      "output": "7",
      "explanation": "Готовый к запуску пример: Generic метод."
    },
    {
      "title": "List<Integer>",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ List<Integer> l = new ArrayList<>(); l.add(1); l.add(2); System.out.println(l); }}",
      "output": "[1, 2]",
      "explanation": "Готовый к запуску пример: List<Integer>."
    },
    {
      "title": "Map<String,Integer>",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ Map<String,Integer> m = new HashMap<>(); m.put(\"a\",1); m.put(\"b\",2); System.out.println(m.get(\"a\")); }}",
      "output": "1",
      "explanation": "Готовый к запуску пример: Map<String,Integer>."
    },
    {
      "title": "Bounded extends Number",
      "code": "public class Main {\n  static <T extends Number> double sum(java.util.List<T> l){ double s=0; for(T x:l) s+=x.doubleValue(); return s; }\n  public static void main(String[] args){ System.out.println(sum(java.util.List.of(1,2,3))); }\n}",
      "output": "6.0",
      "explanation": "Готовый к запуску пример: Bounded extends Number."
    },
    {
      "title": "Wildcards ?",
      "code": "import java.util.*;\npublic class Main { static void p(List<?> l){ for (Object o : l) System.out.print(o+\" \"); }\n  public static void main(String[] args){ p(List.of(1,2,3)); p(List.of(\"a\",\"b\")); }\n}",
      "output": "1 2 3 a b ",
      "explanation": "Готовый к запуску пример: Wildcards ?."
    },
    {
      "title": "Класс-стек",
      "code": "import java.util.*;\nclass Stack<T> { List<T> d = new ArrayList<>(); void push(T x){ d.add(x); } T pop(){ return d.remove(d.size()-1); } }\npublic class Main { public static void main(String[] args){ Stack<Integer> s=new Stack<>(); s.push(1); s.push(2); System.out.println(s.pop()); }}",
      "output": "2",
      "explanation": "Готовый к запуску пример: Класс-стек."
    },
    {
      "title": "Generic Comparable",
      "code": "import java.util.*;\npublic class Main { static <T extends Comparable<T>> T max(List<T> l){ T m=l.get(0); for(T x:l) if (x.compareTo(m)>0) m=x; return m; } public static void main(String[] args){ System.out.println(max(List.of(3,7,1,9,4))); }}",
      "output": "9",
      "explanation": "Готовый к запуску пример: Generic Comparable."
    },
    {
      "title": "Type inference (var)",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ var l = new ArrayList<String>(); l.add(\"hi\"); System.out.println(l); }}",
      "output": "[hi]",
      "explanation": "Готовый к запуску пример: Type inference (var)."
    }
  ],
  "33": [
    {
      "title": "ArrayList",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ List<Integer> l=new ArrayList<>(List.of(1,2,3)); System.out.println(l); }}",
      "output": "[1, 2, 3]",
      "explanation": "Готовый к запуску пример: ArrayList."
    },
    {
      "title": "HashSet — без дубликатов",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ Set<Integer> s=new HashSet<>(List.of(1,2,2,3)); System.out.println(s.size()); }}",
      "output": "3",
      "explanation": "Готовый к запуску пример: HashSet — без дубликатов."
    },
    {
      "title": "HashMap",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ Map<String,Integer> m=new HashMap<>(); m.put(\"Аня\",12); m.put(\"Боря\",14); System.out.println(m.get(\"Аня\")); }}",
      "output": "12",
      "explanation": "Готовый к запуску пример: HashMap."
    },
    {
      "title": "Map.containsKey",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ Map<String,Integer> m=new HashMap<>(); m.put(\"x\",1); System.out.println(m.containsKey(\"y\")); }}",
      "output": "false",
      "explanation": "Готовый к запуску пример: Map.containsKey."
    },
    {
      "title": "Перебор Map",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ Map<String,Integer> m=new LinkedHashMap<>(); m.put(\"a\",1); m.put(\"b\",2); for (var e : m.entrySet()) System.out.println(e.getKey()+\":\"+e.getValue()); }}",
      "output": "a:1\nb:2",
      "explanation": "Готовый к запуску пример: Перебор Map."
    },
    {
      "title": "Stack",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ Deque<Integer> s=new ArrayDeque<>(); s.push(1); s.push(2); System.out.println(s.pop()); }}",
      "output": "2",
      "explanation": "Готовый к запуску пример: Stack."
    },
    {
      "title": "Queue",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ Queue<Integer> q=new LinkedList<>(); q.add(1); q.add(2); System.out.println(q.poll()); }}",
      "output": "1",
      "explanation": "Готовый к запуску пример: Queue."
    },
    {
      "title": "Sort",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ List<Integer> l=new ArrayList<>(List.of(3,1,2)); Collections.sort(l); System.out.println(l); }}",
      "output": "[1, 2, 3]",
      "explanation": "Готовый к запуску пример: Sort."
    },
    {
      "title": "Подсчёт слов",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  String[] w = {\"a\",\"b\",\"a\",\"c\",\"b\",\"a\"};\n  Map<String,Integer> cnt = new HashMap<>();\n  for (String x : w) cnt.merge(x, 1, Integer::sum);\n  System.out.println(cnt);\n}}",
      "output": "{a=3, b=2, c=1}",
      "explanation": "Готовый к запуску пример: Подсчёт слов."
    },
    {
      "title": "TreeSet — отсортирован",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ Set<Integer> t=new TreeSet<>(List.of(5,1,4,2,3)); System.out.println(t); }}",
      "output": "[1, 2, 3, 4, 5]",
      "explanation": "Готовый к запуску пример: TreeSet — отсортирован."
    }
  ],
  "34": [
    {
      "title": "for-each",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ List<String> l = List.of(\"a\",\"b\",\"c\"); for (String s : l) System.out.println(s); }}",
      "output": "a\nb\nc",
      "explanation": "Готовый к запуску пример: for-each."
    },
    {
      "title": "Iterator вручную",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ Iterator<Integer> it = List.of(1,2,3).iterator(); while (it.hasNext()) System.out.print(it.next()+\" \"); }}",
      "output": "1 2 3 ",
      "explanation": "Готовый к запуску пример: Iterator вручную."
    },
    {
      "title": "ListIterator",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  List<Integer> l = new ArrayList<>(List.of(1,2,3));\n  ListIterator<Integer> it = l.listIterator();\n  while (it.hasNext()) System.out.print(it.next() + \" \");\n}}",
      "output": "1 2 3 ",
      "explanation": "Готовый к запуску пример: ListIterator."
    },
    {
      "title": "Удаление через Iterator",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  List<Integer> l = new ArrayList<>(List.of(1,2,3,4));\n  Iterator<Integer> it = l.iterator();\n  while (it.hasNext()) if (it.next() % 2 == 0) it.remove();\n  System.out.println(l);\n}}",
      "output": "[1, 3]",
      "explanation": "Готовый к запуску пример: Удаление через Iterator."
    },
    {
      "title": "forEach()",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ List.of(1,2,3).forEach(System.out::println); }}",
      "output": "1\n2\n3",
      "explanation": "Готовый к запуску пример: forEach()."
    },
    {
      "title": "Map итерация",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  Map<String,Integer> m = new LinkedHashMap<>();\n  m.put(\"a\",1); m.put(\"b\",2);\n  for (var e : m.entrySet()) System.out.println(e.getKey()+\"=\"+e.getValue());\n}}",
      "output": "a=1\nb=2",
      "explanation": "Готовый к запуску пример: Map итерация."
    },
    {
      "title": "Set итерация",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  Set<Integer> s = new TreeSet<>(List.of(3,1,2));\n  for (int x : s) System.out.print(x+\" \");\n}}",
      "output": "1 2 3 ",
      "explanation": "Готовый к запуску пример: Set итерация."
    },
    {
      "title": "ConcurrentModificationException — пример",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  List<Integer> l = new ArrayList<>(List.of(1,2,3));\n  try { for (int x : l) if (x == 2) l.remove(Integer.valueOf(x)); }\n  catch (ConcurrentModificationException e){ System.out.println(\"CME!\"); }\n}}",
      "output": "CME!",
      "explanation": "Готовый к запуску пример: ConcurrentModificationException — пример."
    },
    {
      "title": "Обратный итератор",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  List<Integer> l = new ArrayList<>(List.of(1,2,3));\n  ListIterator<Integer> it = l.listIterator(l.size());\n  while (it.hasPrevious()) System.out.print(it.previous()+\" \");\n}}",
      "output": "3 2 1 ",
      "explanation": "Готовый к запуску пример: Обратный итератор."
    },
    {
      "title": "Iterable своего класса",
      "code": "import java.util.*;\nclass Range implements Iterable<Integer> { int n; Range(int n){this.n=n;}\n  public Iterator<Integer> iterator(){ return new Iterator<>(){ int i=0; public boolean hasNext(){return i<n;} public Integer next(){return i++;} }; } }\npublic class Main { public static void main(String[] args){ for (int x : new Range(4)) System.out.print(x+\" \"); }}",
      "output": "0 1 2 3 ",
      "explanation": "Готовый к запуску пример: Iterable своего класса."
    }
  ],
  "35": [
    {
      "title": "Runnable",
      "code": "Runnable r = () -> System.out.println(\"Привет!\");\nr.run();",
      "output": "Привет!",
      "explanation": "Готовый к запуску пример: Runnable."
    },
    {
      "title": "Function",
      "code": "import java.util.function.Function;\npublic class Main { public static void main(String[] args){ Function<Integer,Integer> sqr = x -> x*x; System.out.println(sqr.apply(5)); }}",
      "output": "25",
      "explanation": "Готовый к запуску пример: Function."
    },
    {
      "title": "Predicate",
      "code": "import java.util.function.Predicate;\npublic class Main { public static void main(String[] args){ Predicate<Integer> even = n -> n%2==0; System.out.println(even.test(4)); }}",
      "output": "true",
      "explanation": "Готовый к запуску пример: Predicate."
    },
    {
      "title": "Consumer",
      "code": "import java.util.function.Consumer;\npublic class Main { public static void main(String[] args){ Consumer<String> c = s -> System.out.println(\"hi \"+s); c.accept(\"world\"); }}",
      "output": "hi world",
      "explanation": "Готовый к запуску пример: Consumer."
    },
    {
      "title": "Supplier",
      "code": "import java.util.function.Supplier;\npublic class Main { public static void main(String[] args){ Supplier<Double> s = () -> Math.random(); System.out.println(s.get() >= 0); }}",
      "output": "true",
      "explanation": "Готовый к запуску пример: Supplier."
    },
    {
      "title": "BiFunction",
      "code": "import java.util.function.BiFunction;\npublic class Main { public static void main(String[] args){ BiFunction<Integer,Integer,Integer> add = (a,b) -> a+b; System.out.println(add.apply(2,3)); }}",
      "output": "5",
      "explanation": "Готовый к запуску пример: BiFunction."
    },
    {
      "title": "forEach + lambda",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ List.of(1,2,3).forEach(n -> System.out.println(n*10)); }}",
      "output": "10\n20\n30",
      "explanation": "Готовый к запуску пример: forEach + lambda."
    },
    {
      "title": "Сортировка с lambda",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  List<String> l = new ArrayList<>(List.of(\"long\",\"a\",\"mid\"));\n  l.sort((x,y) -> x.length() - y.length());\n  System.out.println(l);\n}}",
      "output": "[a, mid, long]",
      "explanation": "Готовый к запуску пример: Сортировка с lambda."
    },
    {
      "title": "Method reference",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ List.of(\"a\",\"b\",\"c\").forEach(System.out::println); }}",
      "output": "a\nb\nc",
      "explanation": "Готовый к запуску пример: Method reference."
    },
    {
      "title": "Свой функциональный интерфейс",
      "code": "public class Main {\n  interface F { int apply(int x); }\n  public static void main(String[] args){ F twice = x -> x*2; System.out.println(twice.apply(7)); }\n}",
      "output": "14",
      "explanation": "Готовый к запуску пример: Свой функциональный интерфейс."
    }
  ],
  "36": [
    {
      "title": "Сумма чётных",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){\n  int s = List.of(1,2,3,4,5).stream().filter(n -> n%2==0).mapToInt(Integer::intValue).sum();\n  System.out.println(s);\n}}",
      "output": "6",
      "explanation": "Готовый к запуску пример: Сумма чётных."
    },
    {
      "title": "map",
      "code": "import java.util.*;\nimport java.util.stream.*;\npublic class Main { public static void main(String[] args){\n  List<Integer> r = List.of(1,2,3).stream().map(n -> n*n).collect(Collectors.toList());\n  System.out.println(r);\n}}",
      "output": "[1, 4, 9]",
      "explanation": "Готовый к запуску пример: map."
    },
    {
      "title": "count",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ System.out.println(List.of(1,2,3,4).stream().filter(n -> n > 2).count()); }}",
      "output": "2",
      "explanation": "Готовый к запуску пример: count."
    },
    {
      "title": "sorted",
      "code": "import java.util.*;\nimport java.util.stream.*;\npublic class Main { public static void main(String[] args){\n  System.out.println(List.of(3,1,2).stream().sorted().collect(Collectors.toList()));\n}}",
      "output": "[1, 2, 3]",
      "explanation": "Готовый к запуску пример: sorted."
    },
    {
      "title": "distinct",
      "code": "import java.util.*;\nimport java.util.stream.*;\npublic class Main { public static void main(String[] args){\n  System.out.println(List.of(1,1,2,3,3,4).stream().distinct().collect(Collectors.toList()));\n}}",
      "output": "[1, 2, 3, 4]",
      "explanation": "Готовый к запуску пример: distinct."
    },
    {
      "title": "joining",
      "code": "import java.util.*;\nimport java.util.stream.*;\npublic class Main { public static void main(String[] args){\n  System.out.println(List.of(\"a\",\"b\",\"c\").stream().collect(Collectors.joining(\"-\")));\n}}",
      "output": "a-b-c",
      "explanation": "Готовый к запуску пример: joining."
    },
    {
      "title": "reduce",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ System.out.println(List.of(1,2,3,4).stream().reduce(0, Integer::sum)); }}",
      "output": "10",
      "explanation": "Готовый к запуску пример: reduce."
    },
    {
      "title": "IntStream.range",
      "code": "import java.util.stream.*;\npublic class Main { public static void main(String[] args){ System.out.println(IntStream.range(1,6).sum()); }}",
      "output": "15",
      "explanation": "Готовый к запуску пример: IntStream.range."
    },
    {
      "title": "max",
      "code": "import java.util.*;\npublic class Main { public static void main(String[] args){ System.out.println(List.of(3,7,2,9).stream().max(Integer::compareTo).get()); }}",
      "output": "9",
      "explanation": "Готовый к запуску пример: max."
    },
    {
      "title": "groupBy",
      "code": "import java.util.*;\nimport java.util.stream.*;\npublic class Main { public static void main(String[] args){\n  var g = java.util.stream.Stream.of(\"apple\",\"banana\",\"avocado\",\"cherry\")\n    .collect(Collectors.groupingBy(s -> s.charAt(0)));\n  System.out.println(g.get('a').size());\n}}",
      "output": "2",
      "explanation": "Готовый к запуску пример: groupBy."
    }
  ],
  "37": [
    {
      "title": "Thread через Runnable",
      "code": "public class Main { public static void main(String[] args) throws InterruptedException {\n  Runnable t = () -> System.out.println(\"в потоке\");\n  Thread th = new Thread(t);\n  th.start(); th.join();\n}}",
      "output": "в потоке",
      "explanation": "Готовый к запуску пример: Thread через Runnable."
    },
    {
      "title": "Sleep",
      "code": "public class Main { public static void main(String[] args) throws InterruptedException {\n  Thread.sleep(100);\n  System.out.println(\"проснулся\");\n}}",
      "output": "проснулся",
      "explanation": "Готовый к запуску пример: Sleep."
    },
    {
      "title": "2 потока",
      "code": "public class Main { public static void main(String[] args) throws InterruptedException {\n  Thread a = new Thread(() -> System.out.println(\"A\"));\n  Thread b = new Thread(() -> System.out.println(\"B\"));\n  a.start(); b.start(); a.join(); b.join();\n}}",
      "output": "A B (в произвольном порядке)",
      "explanation": "Готовый к запуску пример: 2 потока."
    },
    {
      "title": "Цикл в потоке",
      "code": "public class Main { public static void main(String[] args) throws InterruptedException {\n  Thread t = new Thread(() -> { for (int i=0;i<3;i++) System.out.println(\"i=\"+i); });\n  t.start(); t.join();\n}}",
      "output": "i=0\ni=1\ni=2",
      "explanation": "Готовый к запуску пример: Цикл в потоке."
    },
    {
      "title": "extends Thread",
      "code": "class W extends Thread { public void run(){ System.out.println(\"W run\"); } }\npublic class Main { public static void main(String[] args) throws InterruptedException { Thread t = new W(); t.start(); t.join(); }}",
      "output": "W run",
      "explanation": "Готовый к запуску пример: extends Thread."
    },
    {
      "title": "Имя потока",
      "code": "public class Main { public static void main(String[] args){ System.out.println(Thread.currentThread().getName()); }}",
      "output": "main",
      "explanation": "Готовый к запуску пример: Имя потока."
    },
    {
      "title": "Несколько задач",
      "code": "public class Main { public static void main(String[] args) throws InterruptedException {\n  Thread[] ts = new Thread[3];\n  for (int i=0;i<3;i++){ final int k=i; ts[i] = new Thread(() -> System.out.println(\"task \"+k)); ts[i].start(); }\n  for (Thread t : ts) t.join();\n}}",
      "output": "task 0\ntask 1\ntask 2 (порядок может отличаться)",
      "explanation": "Готовый к запуску пример: Несколько задач."
    },
    {
      "title": "synchronized",
      "code": "public class Main {\n  static int count = 0;\n  static synchronized void inc(){ count++; }\n  public static void main(String[] args) throws InterruptedException {\n    Thread a = new Thread(() -> { for (int i=0;i<1000;i++) inc(); });\n    Thread b = new Thread(() -> { for (int i=0;i<1000;i++) inc(); });\n    a.start(); b.start(); a.join(); b.join();\n    System.out.println(count);\n  }\n}",
      "output": "2000",
      "explanation": "Готовый к запуску пример: synchronized."
    },
    {
      "title": "AtomicInteger",
      "code": "import java.util.concurrent.atomic.AtomicInteger;\npublic class Main { public static void main(String[] args) throws InterruptedException {\n  AtomicInteger c = new AtomicInteger();\n  Thread a = new Thread(() -> { for (int i=0;i<1000;i++) c.incrementAndGet(); });\n  Thread b = new Thread(() -> { for (int i=0;i<1000;i++) c.incrementAndGet(); });\n  a.start(); b.start(); a.join(); b.join();\n  System.out.println(c.get());\n}}",
      "output": "2000",
      "explanation": "Готовый к запуску пример: AtomicInteger."
    },
    {
      "title": "ExecutorService",
      "code": "import java.util.concurrent.*;\npublic class Main { public static void main(String[] args) throws Exception {\n  ExecutorService ex = Executors.newFixedThreadPool(2);\n  Future<Integer> f = ex.submit(() -> 21 * 2);\n  System.out.println(f.get());\n  ex.shutdown();\n}}",
      "output": "42",
      "explanation": "Готовый к запуску пример: ExecutorService."
    }
  ],
  "38": [
    {
      "title": "Только демонстрация — нужен драйвер",
      "code": "public class Main { public static void main(String[] args){\n  System.out.println(\"Для запуска подключите драйвер, напр. SQLite: org.xerial:sqlite-jdbc.\");\n}}",
      "output": "Для запуска подключите драйвер...",
      "explanation": "Готовый к запуску пример: Только демонстрация — нужен драйвер."
    },
    {
      "title": "DriverManager.getConnection (демо)",
      "code": "public class Main { public static void main(String[] args){\n  String url = \"jdbc:sqlite:my.db\";\n  System.out.println(\"URL: \" + url);\n}}",
      "output": "URL: jdbc:sqlite:my.db",
      "explanation": "Готовый к запуску пример: DriverManager.getConnection (демо)."
    },
    {
      "title": "SQL SELECT (демо)",
      "code": "public class Main { public static void main(String[] args){\n  String sql = \"SELECT id, name FROM users WHERE age > ?\";\n  System.out.println(sql);\n}}",
      "output": "SELECT id, name FROM users WHERE age > ?",
      "explanation": "Готовый к запуску пример: SQL SELECT (демо)."
    },
    {
      "title": "PreparedStatement (демо)",
      "code": "public class Main { public static void main(String[] args){\n  // try (var ps = c.prepareStatement(\"INSERT INTO t(v) VALUES(?)\")){ ps.setInt(1, 5); ps.executeUpdate(); }\n  System.out.println(\"Используйте PreparedStatement для безопасности.\");\n}}",
      "output": "Используйте PreparedStatement для безопасности.",
      "explanation": "Готовый к запуску пример: PreparedStatement (демо)."
    },
    {
      "title": "ResultSet (демо)",
      "code": "public class Main { public static void main(String[] args){\n  // while (rs.next()) System.out.println(rs.getString(\"name\"));\n  System.out.println(\"Перебор ResultSet через rs.next()\");\n}}",
      "output": "Перебор ResultSet через rs.next()",
      "explanation": "Готовый к запуску пример: ResultSet (демо)."
    },
    {
      "title": "Транзакция (демо)",
      "code": "public class Main { public static void main(String[] args){\n  // c.setAutoCommit(false); ... c.commit(); / c.rollback();\n  System.out.println(\"setAutoCommit(false) + commit()/rollback()\");\n}}",
      "output": "setAutoCommit(false) + commit()/rollback()",
      "explanation": "Готовый к запуску пример: Транзакция (демо)."
    },
    {
      "title": "Closeable try-with-resources",
      "code": "public class Main { public static void main(String[] args){\n  // try (Connection c = DriverManager.getConnection(url)){ ... }\n  System.out.println(\"Connection закрывается автоматически\");\n}}",
      "output": "Connection закрывается автоматически",
      "explanation": "Готовый к запуску пример: Closeable try-with-resources."
    },
    {
      "title": "Batch (демо)",
      "code": "public class Main { public static void main(String[] args){\n  // ps.addBatch(); ps.addBatch(); ps.executeBatch();\n  System.out.println(\"addBatch + executeBatch — быстрее множественных insert\");\n}}",
      "output": "addBatch + executeBatch — быстрее множественных insert",
      "explanation": "Готовый к запуску пример: Batch (демо)."
    },
    {
      "title": "Защита от SQL-инъекций",
      "code": "public class Main { public static void main(String[] args){\n  String unsafe = \"' OR '1'='1\";\n  System.out.println(\"Использование PreparedStatement делает '\" + unsafe + \"' безопасным.\");\n}}",
      "output": "Использование PreparedStatement делает ' OR '1'='1' безопасным.",
      "explanation": "Готовый к запуску пример: Защита от SQL-инъекций."
    },
    {
      "title": "Метаданные (демо)",
      "code": "public class Main { public static void main(String[] args){\n  // ResultSetMetaData md = rs.getMetaData();\n  System.out.println(\"md.getColumnCount(), md.getColumnName(i)\");\n}}",
      "output": "md.getColumnCount(), md.getColumnName(i)",
      "explanation": "Готовый к запуску пример: Метаданные (демо)."
    }
  ],
  "39": [
    {
      "title": "Версия из манифеста (демо)",
      "code": "public class Main { public static void main(String[] args){\n  String v = Main.class.getPackage().getImplementationVersion();\n  System.out.println(\"Version: \" + (v == null ? \"unknown\" : v));\n}}",
      "output": "Version: unknown (или из jar)",
      "explanation": "Готовый к запуску пример: Версия из манифеста (демо)."
    },
    {
      "title": "Аргументы программы",
      "code": "public class Main { public static void main(String[] args){\n  System.out.println(\"args: \" + args.length);\n}}",
      "output": "args: 0 (если запустить без аргументов)",
      "explanation": "Готовый к запуску пример: Аргументы программы."
    },
    {
      "title": "System property",
      "code": "public class Main { public static void main(String[] args){\n  System.out.println(System.getProperty(\"java.specification.version\"));\n}}",
      "output": "21 (для JDK 21)",
      "explanation": "Готовый к запуску пример: System property."
    },
    {
      "title": "Class-Path / ресурс",
      "code": "public class Main { public static void main(String[] args){\n  var url = Main.class.getResource(\"/log.properties\");\n  System.out.println(url == null ? \"нет ресурса\" : url);\n}}",
      "output": "нет ресурса",
      "explanation": "Готовый к запуску пример: Class-Path / ресурс."
    },
    {
      "title": "pom.xml — пример dependency",
      "code": "public class Main { public static void main(String[] args){\n  System.out.println(\"<dependency><groupId>org.junit.jupiter</groupId>...</dependency>\");\n}}",
      "output": "<dependency>...</dependency>",
      "explanation": "Готовый к запуску пример: pom.xml — пример dependency."
    },
    {
      "title": "build.gradle dep",
      "code": "public class Main { public static void main(String[] args){\n  System.out.println(\"implementation 'com.google.code.gson:gson:2.10.1'\");\n}}",
      "output": "implementation 'com.google.code.gson:gson:2.10.1'",
      "explanation": "Готовый к запуску пример: build.gradle dep."
    },
    {
      "title": "mvn package",
      "code": "public class Main { public static void main(String[] args){\n  System.out.println(\"mvn clean package — соберёт jar в target/\");\n}}",
      "output": "mvn clean package — соберёт jar в target/",
      "explanation": "Готовый к запуску пример: mvn package."
    },
    {
      "title": "gradle build",
      "code": "public class Main { public static void main(String[] args){\n  System.out.println(\"./gradlew build — соберёт jar в build/libs\");\n}}",
      "output": "./gradlew build — соберёт jar в build/libs",
      "explanation": "Готовый к запуску пример: gradle build."
    },
    {
      "title": "Запуск jar",
      "code": "public class Main { public static void main(String[] args){\n  System.out.println(\"java -jar target/app-1.0.jar\");\n}}",
      "output": "java -jar target/app-1.0.jar",
      "explanation": "Готовый к запуску пример: Запуск jar."
    },
    {
      "title": "Структура проекта",
      "code": "public class Main { public static void main(String[] args){\n  System.out.println(\"src/main/java • src/test/java • pom.xml/build.gradle\");\n}}",
      "output": "src/main/java • src/test/java • pom.xml/build.gradle",
      "explanation": "Готовый к запуску пример: Структура проекта."
    }
  ],
  "40": [
    {
      "title": "Угадай число",
      "code": "import java.util.*;\npublic class Guess { public static void main(String[] args){\n  int secret = (int)(Math.random()*100) + 1;\n  Scanner sc = new Scanner(System.in);\n  int g;\n  do {\n    System.out.print(\"? \"); g = sc.nextInt();\n    System.out.println(g < secret ? \"Больше\" : g > secret ? \"Меньше\" : \"Угадал!\");\n  } while (g != secret);\n  sc.close();\n}}",
      "output": "(интерактивно)",
      "explanation": "Готовый к запуску пример: Угадай число."
    },
    {
      "title": "Калькулятор",
      "code": "import java.util.*;\npublic class Calc { public static void main(String[] args){\n  Scanner sc = new Scanner(\"3 + 4\");\n  double a = sc.nextDouble(); String op = sc.next(); double b = sc.nextDouble();\n  double r = switch (op){ case \"+\" -> a+b; case \"-\" -> a-b; case \"*\" -> a*b; case \"/\" -> a/b; default -> 0; };\n  System.out.println(r);\n  sc.close();\n}}",
      "output": "7.0",
      "explanation": "Готовый к запуску пример: Калькулятор."
    },
    {
      "title": "Банковский счёт",
      "code": "public class Bank { public static void main(String[] args){\n  Account a = new Account(\"Аня\", 1000);\n  a.deposit(500); a.withdraw(300);\n  System.out.println(a.getOwner() + \": \" + a.getBalance());\n}}\nclass Account {\n  private String owner; private double balance;\n  public Account(String o, double b){ owner=o; balance=b; }\n  public void deposit(double x){ if (x>0) balance+=x; }\n  public boolean withdraw(double x){ if (x>0 && x<=balance){ balance-=x; return true; } return false; }\n  public String getOwner(){ return owner; }\n  public double getBalance(){ return balance; }\n}",
      "output": "Аня: 1200.0",
      "explanation": "Готовый к запуску пример: Банковский счёт."
    },
    {
      "title": "TODO в памяти",
      "code": "import java.util.*;\npublic class Todo { public static void main(String[] args){\n  List<String> items = new ArrayList<>();\n  items.add(\"купить хлеб\"); items.add(\"учить Java\"); items.remove(0);\n  for (int i=0;i<items.size();i++) System.out.println((i+1)+\". \"+items.get(i));\n}}",
      "output": "1. учить Java",
      "explanation": "Готовый к запуску пример: TODO в памяти."
    },
    {
      "title": "FizzBuzz",
      "code": "public class FizzBuzz { public static void main(String[] args){\n  for (int i=1;i<=15;i++){\n    if (i%15==0) System.out.println(\"FizzBuzz\");\n    else if (i%3==0) System.out.println(\"Fizz\");\n    else if (i%5==0) System.out.println(\"Buzz\");\n    else System.out.println(i);\n  }\n}}",
      "output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
      "explanation": "Готовый к запуску пример: FizzBuzz."
    },
    {
      "title": "Камень-ножницы-бумага",
      "code": "import java.util.*;\npublic class RPS { public static void main(String[] args){\n  String[] m = {\"камень\",\"ножницы\",\"бумага\"};\n  String you = \"камень\", bot = m[(int)(Math.random()*3)];\n  System.out.println(\"Ты: \"+you+\", Бот: \"+bot);\n}}",
      "output": "Ты: камень, Бот: <случайно>",
      "explanation": "Готовый к запуску пример: Камень-ножницы-бумага."
    },
    {
      "title": "Простой счётчик слов",
      "code": "import java.util.*;\npublic class WC { public static void main(String[] args){\n  String text = \"alpha beta gamma alpha gamma alpha\";\n  Map<String,Integer> cnt = new HashMap<>();\n  for (String w : text.split(\" \")) cnt.merge(w, 1, Integer::sum);\n  System.out.println(cnt);\n}}",
      "output": "{alpha=3, beta=1, gamma=2}",
      "explanation": "Готовый к запуску пример: Простой счётчик слов."
    },
    {
      "title": "Дневник в файл",
      "code": "import java.nio.file.*;\nimport java.io.IOException;\npublic class Diary { public static void main(String[] args) throws IOException {\n  Files.writeString(Path.of(\"diary.txt\"), \"23 мая: учил Java.\\n\", StandardOpenOption.CREATE, StandardOpenOption.APPEND);\n  System.out.println(Files.readString(Path.of(\"diary.txt\")));\n}}",
      "output": "23 мая: учил Java.",
      "explanation": "Готовый к запуску пример: Дневник в файл."
    },
    {
      "title": "Конвертер температуры",
      "code": "public class Temp { public static void main(String[] args){\n  double c = 25;\n  double f = c * 9.0/5.0 + 32;\n  System.out.println(c + \" C = \" + f + \" F\");\n}}",
      "output": "25.0 C = 77.0 F",
      "explanation": "Готовый к запуску пример: Конвертер температуры."
    },
    {
      "title": "Магазин — товары и корзина",
      "code": "import java.util.*;\npublic class Shop { public static void main(String[] args){\n  Map<String,Double> prices = Map.of(\"хлеб\", 30.0, \"молоко\", 80.0);\n  List<String> cart = List.of(\"хлеб\",\"молоко\",\"хлеб\");\n  double total = 0;\n  for (String item : cart) total += prices.get(item);\n  System.out.println(\"Итого: \" + total);\n}}",
      "output": "Итого: 140.0",
      "explanation": "Готовый к запуску пример: Магазин — товары и корзина."
    }
  ]
};
