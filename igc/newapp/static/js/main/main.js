$(document).ready(function () {
  cooldown = setTimeout(() => {}, 1);

  let scope = {
    list_animal: true,
    list_obj: true,
    list_person: true,
    list_plant: true,
    list_verb: true,
  };

  let appState = {
    _coins: [],
    latestResponse: null,
    latestCoinResult: null,
    sortedCoinResult: null,
    currentSearchType: "NumismaticObject",
    currentCoin: {
      obverse: { coin: [], keywords: [] },
      reverse: { coin: [], keywords: [] },
    },
    relationString: "",
    cursorPosition: null,
    currentPage: 1,
    resultsPerPage: 100,
    totalPages: 1,

    /**
     * Getter for _coins array.
     * @returns {Array} The current array of coins.
     *
     * @Author: Danilo Pantic
     */
    get coins() {
      return this._coins;
    },

    /**
     * Setter for _coins array, triggers state change actions.
     * @param {Array} value - The new coin array.
     *
     * @Author: Danilo Pantic
     */
    set coins(value) {
      this._coins = value;
      this.onCoinsChange();
    },

    /**
     * Adds a coin to the state and triggers updates.
     * @param {Object} coin - The coin object to add.
     *
     * @Author: Danilo Pantic
     */
    addCoin: function (coin) {
      this._coins.push(coin);
      this.onCoinsChange();
    },

    /**
     * Clears all coins from the state and triggers updates.
     *
     * @Author: Danilo Pantic
     */
    clearCoins: function () {
      this._coins = [];
      this.onCoinsChange();

      $("#searchActions .searchcoin").prop("disabled", true);
    },

    /**
     * Function to handle updates when coins change.
     *
     * @Author: Danilo Pantic
     */
    onCoinsChange: function () {
      renderCoins();
      refreshRelationString();
      regenerateQuery();
    },

    /**
     * Sets the current page and rerenders visual elements..
     * @param {number} page - The desired page number.
     *
     * @Author: Danilo Pantic
     */
    setPage: function (page) {
      this.currentPage = page;
      renderResults();
    },

    /**
     * Switches to next page (if possible) and rerenders respective results.
     *
     * @Author: Danilo Pantic
     */
    nextPage: function () {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.renderCurrentPage();
      }
    },

    /**
     * Switches to previous page (if possible) and rerenders respective results.
     *
     * @Author: Danilo Pantic
     */
    previousPage: function () {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderCurrentPage();
      }
    },

    /**
     * Renders the results of the current page based on the current page number and results per page settings.
     * This function handles sorting of the results, slicing them for the current page, grouping them according to selected criteria,
     * and finally rendering them on the webpage. It also updates the pagination controls and resets the scroll position of the results container.
     *
     * @Author: Danilo Pantic
     */
    renderCurrentPage: function () {
      sortResults();

      const start = (this.currentPage - 1) * this.resultsPerPage;
      const end = start + this.resultsPerPage;
      const currentItems = appState.sortedCoinResult.slice(start, end);
      const groupedResults = groupResults(
        currentItems,
        $("#groupSelect").val()
      );

      renderResults(groupedResults);
      updatePaginationControls();
      $("#resultBox").scrollTop(0);
    },
  };

  // Author: Mohammed Sayed Mahmod
  const tour = introJs()
    .setOptions({
      steps: [
        {
          intro:
            "Welcome to the Iconographic Search platform, where you can explore and search for coins based on their iconographic features.",
        },
        {
          element: document.querySelector("#searchType"),
          intro:
            "Choose 'Coin search' to find individual coins, or 'Type search' to explore types of coins. 'Coin search' focuses on specific coin instances, while 'Type search' is for researching broader categories and series of coins.",
          position: "top",
        },
        {
          element: document.querySelector("#front .textbox"),
          intro:
            "Enter descriptions for the obverse side of the coin here. Autocomplete suggestions will help you refine your search.",
          position: "bottom",
        },
        {
          element: document.querySelector("#keywords"),
          intro:
            "Add keywords here to refine your search. Keywords can be attributes or characteristics of the coin. You can add multiple keywords and negate them to exclude certain characteristics from your search.",
          position: "right",
        },
        {
          element: document.querySelector("[data-action=addKeyword]"),
          intro:
            "Use this plus button to add multiple keywords. Once added, you can click on a keyword to toggle its negation, allowing you to search for coins without these features.",
          position: "right",
        },
        {
          element: document.querySelector("#back .textbox"),
          intro:
            "Similarly, describe the reverse side of the coin here to further specify your search.",
          position: "bottom",
        },
        {
          element: document.querySelector("#back"),
          intro:
            "Type the first letters and you will immediately receive suggestions for your search.",
          position: "right",
        },
        {
          element: document.querySelector("#back .textbox"),
          intro:
            "Choose what you're looking for and continue with the your search until you're satisfied.",
          position: "right",
        },
        {
          element: document.querySelector("#searchActions .addcoin"),
          intro:
            "After describing the coin and setting keywords, click here to add it to your query list.",
          position: "left",
        },
        {
          element: document.querySelector("#queryBox"),
          intro:
            "Your queried items will appear here. You can edit, remove, or directly search them in the database.",
          position: "top",
        },
        {
          element: document.querySelector("#searchActions .advancededit"),
          intro:
            "Open the SPARQL/Relations Editor to define complex relationships between queried items and refine your search.",
          position: "top",
        },
        {
          element: document.querySelector("#relationEditorWrapper"),
          intro:
            "In the SPARQL/Relations Editor, you can use the Coin Catalogue to select coins and the Operators to build logical relations. Below, the SPARQL query editor allows for direct query modifications.",
          position: "right",
        },
        {
          element: document.querySelector("#sparqleditor"),
          intro:
            "Here's the SPARQL editor, where you can manually edit the generated query before executing the search.",
          position: "left",
        },
        {
          element: document.querySelector("#searchActions .searchcoin"),
          intro:
            "Finally, this 'Search' button will execute your search based on the criteria and relations you've set. Click here when you're ready to view the results.",
          position: "left",
        },
      ],
      showProgress: true,
      showBullets: true,
      scrollToElement: true,
      exitOnOverlayClick: false,
    })
    .onbeforechange(function () {
      if (this._currentStep === 6) {
        const example = "Arte";
        const target = $("[data-role='coin-description'][data-side='reverse']");

        target.val(example);
        getRecommendations(example, target);
      } else if (this._currentStep === 7) {
        const target = $("[data-role='coin-description'][data-side='reverse']");

        addTag("list_person", 0, "reverse", target);

        getRecommendations("hold", target, () => {
          addTag("list_verb", 0, "reverse", target);
          getRecommendations("bow", target, () => {
            addTag("list_obj", 0, "reverse", target);
          });
        });
      } else if (this._currentStep === 9) {
        addCoinToQuery();
      } else if (this._currentStep === 11) {
        $("#relationMenu").toggleClass("hidden");
        editor.refresh();
      } else if (this._currentStep === 13) {
        $("#relationMenu").toggleClass("hidden");
      }
    });

  // Author: Mohammed Sayed Mahmod
  var editor = CodeMirror.fromTextArea($("#sparqlQuery")[0], {
    mode: "application/sparql-query",
    lineNumbers: true,
    theme: "default",
    value: "",
  });

  /**
   * Converts an item to a tag element
   * @param {Object} item - The item to convert
   * @param {string} category - The category of the item
   * @param {number} pos - The position of the item in the tag container
   * @returns {jQuery} The tag element
   *
   * @Author: Danilo Pantic
   */
  function item2Tag(item, category, pos) {
    let new_tag = $("<div class='tag'></div>");

    if (category === "list_verb") {
      new_tag.addClass("relation");
    } else if (
      category === "list_animal" ||
      category === "list_obj" ||
      category === "list_person" ||
      category === "list_plant"
    ) {
      if (pos === 0) {
        new_tag.addClass("subject");
      } else {
        new_tag.addClass("object");
      }
    }

    let iconToDisplay = null;

    switch (category) {
      case "list_animal":
        iconToDisplay = "pets";
        break;
      case "list_obj":
        iconToDisplay = "category";
        break;
      case "list_plant":
        iconToDisplay = "psychiatry";
        break;
      case "list_verb":
        iconToDisplay = "keyboard_double_arrow_right";
        break;
      case "list_person":
        iconToDisplay = "accessibility_new";
        break;
      default:
        break;
    }

    new_tag.attr("data-category", category);
    new_tag.html(
      `${
        item[item.found_in_column]
      } | <span class='material-symbols-outlined'>${iconToDisplay}</span>`
    );

    return new_tag;
  }

  /**
   * Converts a coin ID string into its numeric index.
   * @param {string} coinId - The coin ID to convert.
   * @returns {number} The numeric index corresponding to the coin ID.
   *
   * @Author: Danilo Pantic
   */
  function coinIdToIndex(coinId) {
    return parseInt(coinId.substring(1)) - 1;
  }

  /**
   * Creates an HTML element from a string of HTML.
   * @param {string} htmlString - The HTML string to convert into an element.
   * @returns {Element} The created HTML element.
   *
   * @Author: Danilo Pantic
   */
  function createElementFromHTML(htmlString) {
    const div = document.createElement("div");
    div.innerHTML = htmlString.trim();
    return div.firstChild;
  }

  /**
   * Converts the relation string from the relation editor to a string
   * @returns {string} The relation string as a string
   *
   * @Author: Danilo Pantic
   */
  function htmlToRelationString() {
    let relationString = "";
    $("#relationEditor")
      .children()
      .each(function () {
        const className = $(this).attr("class");
        if (className.includes("id")) {
          relationString += $(this).text();
        } else if (className.includes("op")) {
          const opMap = {
            p_open: "(",
            p_close: ")",
            and: " AND ",
            or: " OR ",
            not: " NOT ",
          };
          const opType = className.split(" ").find((cl) => opMap[cl]);
          relationString += opMap[opType];
        }
      });
    return relationString;
  }

  /**
   * Converts a relation string to HTML and displays it in the relation editor
   * @param {string} relationString The relation string to convert
   * @returns {void}
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function relationStringToHtml(relationString) {
    const opMap = {
      "(": '<span contenteditable="false" class="op p_open">&nbsp;</span>',
      ")": '<span contenteditable="false" class="op p_close">&nbsp;</span>',
      AND: '<span contenteditable="false" class="op and">&nbsp;</span>',
      OR: '<span contenteditable="false" class="op or">&nbsp;</span>',
      NOT: '<span contenteditable="false" class="op not">&nbsp;</span>',
    };
    const idPattern = /C\d+/g;
    let html = relationString
      .replace(/\(/g, opMap["("])
      .replace(/\)/g, opMap[")"])
      .replace(/AND/g, opMap["AND"])
      .replace(/OR/g, opMap["OR"])
      .replace(/NOT/g, opMap["NOT"])
      .replace(
        idPattern,
        (match) => `<span contenteditable="false" class="id">${match}</span>`
      );

    $("#relationEditor").html(html);
  }

  /**
   * Refreshes the relation string in the relation editor
   * @returns {void}
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function refreshRelationString() {
    relationStringToHtml(appState.relationString);

    if (appState._coins.length > 0) {
      const latestCoinId = "C" + appState._coins.length;

      if (appState.relationString.length > 0) {
        appState.relationString += " OR " + latestCoinId;
      } else {
        appState.relationString = latestCoinId;
      }
    } else {
      appState.relationString = "";
    }

    relationStringToHtml(appState.relationString);
  }

  /**
   * Regenerates the SPARQL query based on the current state
   * @returns {void}
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function regenerateQuery() {
    $.ajax({
      method: "POST",
      url: "callback",
      data: {
        action: "generateQuery",
        coins: JSON.stringify(appState.coins),
        relationString: appState.relationString,
        searchType: appState.currentSearchType,
      },
      success: function (response) {
        if (response.success) {
          editor.setValue(spfmt(response.result));
        } else {
          console.error("Failed to generate query: ", response.error);
        }
      },
      error: function (xhr, status, error) {
        console.error("AJAX-Error:", status, error);
      },
    });
  }

  /**
   * Fetches recommendations for a given query
   * @param {string} q The query to fetch recommendations for
   * @param {JQuery} target The target element to display the recommendations
   * @param {function} onComplete - A callback function that is executed after the recommendations have been successfully fetched and displayed.
   * @returns {void}
   * @async
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function getRecommendations(q = "", target, onComplete = () => {}) {
    const rec = target.parent().children("#rec");

    cleanRecommendations(target);

    $.ajax({
      method: "POST",
      url: "callback",
      data: {
        action: "getRecommendations",
        scope: scope,
        q: q,
      },
      success: function (r) {
        appState.latestResponse = r.result;

        if (r.success) {
          $.each(r.result, (category, items) => {
            items.forEach((item, index) => {
              let rcm = $(
                "<li><span class='name'></span><span class='type'><span class='material-symbols-outlined'></span></span></li>"
              );

              switch (category) {
                case "list_animal":
                  iconToDisplay = "pets";
                  break;
                case "list_obj":
                  iconToDisplay = "category";
                  break;
                case "list_plant":
                  iconToDisplay = "psychiatry";
                  break;
                case "list_verb":
                  iconToDisplay = "keyboard_double_arrow_right";
                  break;
                case "list_person":
                  iconToDisplay = "accessibility_new";
                  break;
                default:
                  break;
              }

              rcm.attr("data-target", target.attr("data-side"));
              rcm.attr("data-category", category);
              rcm.attr("data-item-id", index);

              rcm.children(".name").text(item[item.found_in_column]);
              rcm.children(".type").children("span").text(iconToDisplay);
              rcm
                .children(".type")
                .html(
                  `${rcm.children(".type").html()} ${category.split("_")[1]}`
                );

              rec.children("ul").append(rcm).show();
            });
          });
        }

        onComplete();
      },
    });
  }

  /**
   * Fetches superclasses for a given query
   * @param {string} q The query to fetch superclasses for
   * @returns {Promise} A promise that resolves with the superclasses
   * @async
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function getSuperclasses(q = "") {
    return new Promise((resolve, reject) => {
      $.ajax({
        method: "POST",
        url: "callback",
        data: {
          action: "getRecommendations",
          scope: { hierarchy: true },
          q: q,
        },
        success: function (r) {
          if (r.success) {
            resolve(r.result.hierarchy[0]);
          } else {
            reject("Anfrage Error");
          }
        },
      });
    });
  }

  /**
   * Updates the display of the tag container relative to its input element.
   * @param {jQuery} target - The jQuery object representing the target input element.
   *
   * @Author: Danilo Pantic
   */
  function updateTagContainer(target) {
    const tc = target.parent().children(".tagContainer");
    const rec = target.parent().children("#rec");

    target.attr("placeholder", "").val("");
    target.css("padding-left", 42 + tc.width() + "px").focus();

    rec.css("left", 42 + tc.width() + "px");
  }

  /**
   * Adds a tag representing an item to the UI.
   * @param {string} category - The category of the item.
   * @param {number} item_id - The ID of the item within its category.
   * @param {string} side - The side (obverse or reverse) of the coin being edited.
   * @param {jQuery} target - The jQuery object representing the target input element.
   *
   * @Author: Danilo Pantic
   */
  function addTag(category, item_id, side, target) {
    const tc = target.parent().children(".tagContainer");

    let item = appState.latestResponse[category][item_id];

    appState.currentCoin[side].coin.push({
      category: category,
      item: item,
    });

    const new_tag = item2Tag(item, category, tc.children().length);

    cleanRecommendations(target);
    tc.append(new_tag);
    updateTagContainer(target);
  }

  /**
   * Adds a tag representing an item to the UI.
   * @param {string} category - The category of the item.
   * @param {Object} item - The item to add.
   * @param {string} side - The side (obverse or reverse) of the coin being edited.
   * @param {jQuery} target - The jQuery object representing the target input element.
   * @returns {void}
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function addTagByItem(category, item, side, target) {
    const tc = target.parent().children(".tagContainer");

    appState.currentCoin[side].coin.push({
      category: category,
      item: item,
    });

    const new_tag = item2Tag(item, category, tc.children().length);

    cleanRecommendations(target);
    tc.append(new_tag);
    updateTagContainer(target);
  }

  /**
   * Removes a tag from the UI.
   * @param {jQuery} target - The jQuery object representing the target input element.
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function removeTag(target) {
    const tc = target.parent().children(".tagContainer");

    const side = $(target).attr("data-side");

    appState.currentCoin[side].coin.pop();

    cleanRecommendations(target);
    tc.children().last().remove();
    updateTagContainer(target);
  }

  /**
   * Clears all recommendations from the display.
   * @param {jQuery} target - The jQuery object representing the target element.
   *
   * @Author: Danilo Pantic
   */
  function cleanRecommendations(target) {
    const rec = target.parent().children("#rec");

    rec.children("ul").empty();
  }

  /**
   * Clears all fields and resets the form to its initial state.
   *
   * @Author: Danilo Pantic
   */
  function clearForm() {
    appState.currentCoin = {
      obverse: { coin: [], keywords: [] },
      reverse: { coin: [], keywords: [] },
    };

    let kec = $(".keywordContainer");

    $("#searchBox input[type=text]").val("");
    kec.empty();

    $("#searchBox .tagContainer").each(function () {
      $(this).empty();

      updateTagContainer(
        $(this).parent().children("[data-role='coin-description']")
      );
    });

    $("#front #search input").focus();
  }

  /**
   * Renders the coins data into the UI based on the current application state.
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function renderCoins() {
    var coinTableBody = $("#coincatalogue .coin-tbody");
    coinTableBody.empty();

    appState.coins.forEach(function (coin, index) {
      var coinId = "C" + (index + 1);

      var coinRow = $("<div>").addClass("coin-tr").attr("data-id", coinId);
      var mainContent = $("<div>").addClass("coin-tr-main");
      mainContent.append($("<span>").text(coinId));

      function createSideContent(side) {
        var sideContent = $("<span>");

        var tagContainer = $("<div>").addClass("tagContainer");
        side.coin.forEach(function (coinItem) {
          var tag = item2Tag(
            coinItem.item,
            coinItem.category,
            tagContainer.children().length
          );

          tagContainer.append(tag);
        });

        sideContent.append(tagContainer);

        var keywordsDiv = $("<div>").addClass("keywords");
        var title = $("<div>")
          .addClass("title")
          .append($("<span>").text("Keywords:"));
        var keywordList = $("<div>").addClass("keywordlist");

        (side.keywords || []).forEach(function (kw) {
          var keywordSpan = $("<span>")
            .addClass("keyword")
            .text(kw.text)
            .attr("data-negated", kw.negated ? "true" : "false");

          keywordList.append(keywordSpan);
        });

        keywordsDiv.append(title).append(keywordList);
        sideContent.append(keywordsDiv);

        return sideContent;
      }

      mainContent.append(createSideContent(coin.obverse));
      mainContent.append(createSideContent(coin.reverse));
      mainContent.append(
        $(`<span>
            <div class="editRow">
              <span class="material-symbols-outlined" data-action="editCoin" data-id="${coinId}">
                edit
              </span>
              <span class="material-symbols-outlined" data-action="deleteCoin" data-id="${coinId}">
                delete
              </span>
            </div>
          </span>`)
      );

      coinRow.append(mainContent);
      coinTableBody.append(coinRow);
    });

    $("#searchActions .searchcoin").prop(
      "disabled",
      appState._coins.length === 0
    );
  }

  /**
   * Inserts a given HTML node at the end of the relation editor.
   * @param {Node} node - The HTML node to be appended.
   *
   * @Author: Danilo Pantic
   */
  function insertAtEnd(node) {
    const relationEditor = $("#relationEditor");

    relationEditor.append(node);

    appState.relationString = htmlToRelationString();
    regenerateQuery();
  }

  /**
   * Calculates the width of the arrow in a tooltip based on the number of tooltips present.
   * @returns {number} The calculated width of the arrow.
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function calcArrowWidth() {
    const num_tooltips = $(".tooltip-container .tooltip").length;

    if (num_tooltips > 1) {
      return (
        $(".tooltip-container").outerWidth() -
        $(".tooltip-container .tooltip").first().outerWidth() / 2 -
        $(".tooltip-container .tooltip").last().outerWidth() / 2 -
        5
      );
    }
    return 5;
  }

  /**
   * Creates a tooltip on the specified element with the given text.
   * @param {Element} element - The DOM element to which the tooltip will be attached.
   * @param {string} text - The text content of the tooltip.
   *
   * @Author: Mohammed Sayed Mahmod
   */
  async function createTooltip(element, text) {
    const $element = $(element);
    const elementOffset = $element.offset();
    const elementWidth = $element.outerWidth();

    let tooltipContainer = $(".tooltip-container");
    if (tooltipContainer.length === 0) {
      tooltipContainer = $('<div class="tooltip-container"></div>').appendTo(
        "body"
      );
      $(
        '<div class="tooltip-arrow"><div class="tooltip-arrow-border"></div></div>'
      ).appendTo(tooltipContainer);
    }

    if (tooltipContainer.children(".tooltip").length < 5) {
      $(
        '<div class="tooltip">' +
          text +
          "<div class='tooltip-inner-arrow'></div></div>"
      ).appendTo(tooltipContainer);
    }

    const containerWidth = tooltipContainer.outerWidth();
    const tooltipLeft =
      elementOffset.left + elementWidth / 2 - containerWidth / 2;
    const tooltipTop = elementOffset.top - tooltipContainer.outerHeight() - 10;

    tooltipContainer.css({ left: tooltipLeft, top: tooltipTop });

    $(".tooltip-arrow-border").css({ width: calcArrowWidth() });
  }

  /**
   * Performs a search based on the current query in the SPARQL editor.
   * @returns {void}
   *
   * @Author: Danilo Pantic
   */
  function performSearch() {
    $("#loadingSymbol").removeClass("hidden");
    $("#moveableStage").attr("data-state", "results");

    $.ajax({
      method: "POST",
      url: "callback",
      data: {
        action: "searchCoin",
        q: editor.getValue(),
        searchType: appState.currentSearchType,
      },
      success: function (r) {
        $("#loadingSymbol").addClass("hidden");
        $("#numSearchResults").html(r.result.length);

        if (r.success) {
          appState.latestCoinResult = r.result;
          appState.sortedCoinResult = [...r.result];
          appState.totalPages = Math.ceil(
            appState.sortedCoinResult.length / appState.resultsPerPage
          );
          appState.currentPage = 1;
          appState.renderCurrentPage();
        }
      },
    });
  }

  /**
   * Adds the currently described coin to the query state.
   * @returns {void}
   *
   * @Author: Danilo Pantid
   */
  function addCoinToQuery() {
    let obverseKeywords = $("#front .keywordContainer span.keyword")
      .map(function () {
        return {
          text: $(this).find(".label").text(),
          negated: $(this).attr("data-negated") === "true",
        };
      })
      .get();

    let reverseKeywords = $("#back .keywordContainer span.keyword")
      .map(function () {
        return {
          text: $(this).find(".label").text(),
          negated: $(this).attr("data-negated") === "true",
        };
      })
      .get();

    appState.currentCoin.obverse.keywords = obverseKeywords;
    appState.currentCoin.reverse.keywords = reverseKeywords;

    appState.addCoin(appState.currentCoin);
    clearForm();
  }

  /**
   * Groups the results by a specified property.
   * @param {Array} results - The results to group.
   * @param {string} groupBy - The property to group by.
   * @returns {Object} The grouped results.
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function groupResults(results, groupBy) {
    return results.reduce((acc, result) => {
      const key = result[groupBy] || "uncategorized";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {});
  }

  /**
   * Sorts the results based on the current sort settings.
   * @returns {void}
   * @async
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function sortResults() {
    const sortBy = $("#sortSelect").val();
    const sortDirection = $("#sortDirection").val();

    appState.sortedCoinResult.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "ascending"
          ? valueA - valueB
          : valueB - valueA;
      } else {
        valueA = String(valueA || "").toLowerCase();
        valueB = String(valueB || "").toLowerCase();

        if (valueA < valueB) return sortDirection === "ascending" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "ascending" ? 1 : -1;
        return 0;
      }
    });
  }

  /**
   * Renders the grouped results into the UI.
   * @param {Object} groupedResults - The grouped results to render.
   * @returns {void}
   * @async
   *
   * @Author: Mohammed Sayed Mahmod
   */
  function renderResults(groupedResults) {
    const resultContainer = $("#resultContainer");
    resultContainer.empty();

    $.each(groupedResults, (category, coins) => {
      let categoryDiv = $("<div>")
        .addClass("category")
        .append($("<span>").text(category));
      let categoryContainer = $("<div>").addClass("category-container");

      coins.forEach((coin) => {
        let weight = coin.weight != null ? `${coin.weight.toFixed(2)}g` : null;

        let extraInfoItems = [
          coin.date,
          coin.maxDiameter ? `${coin.maxDiameter}mm` : null,
          weight,
        ].filter((item) => item != null);
        let extraInfoText = extraInfoItems.join(", ");

        let resultItem = $("<div>")
          .addClass("result-item")
          .addClass(coin.type)
          .attr("data-redirect", coin.url)
          .append(
            $("<div>")
              .addClass("result-item-top")
              .append(
                $("<div>")
                  .addClass("result-item-top-id")
                  .append($("<span>").text(coin.id))
              )
              .append(
                $("<img>")
                  .attr("src", coin.thumbnailObverse)
                  .addClass("obverse")
              )
              .append(
                $("<img>")
                  .attr("src", coin.thumbnailReverse)
                  .addClass("reverse")
              )
          )
          .append(
            $("<div>")
              .addClass("result-item-bottom")
              .append(
                $("<p>")
                  .addClass("result-item-bottom-location")
                  .append($("<span>").addClass("location").html(coin.location))
                  .append(
                    $("<span>")
                      .addClass("region")
                      .text(coin.region || "")
                  )
              )
              .append(
                $("<p>")
                  .addClass("result-item-bottom-extra")
                  .text(extraInfoText)
              )
              .append(
                $("<div>")
                  .addClass("result-item-bottom-description")
                  .append(
                    $("<p>").html(
                      `<span>Obverse:</span> ${coin.descriptionObverse}`
                    )
                  )
                  .append(
                    $("<p>").html(
                      `<span>Reverse:</span> ${coin.descriptionReverse}`
                    )
                  )
              )
          );
        categoryContainer.append(resultItem);
      });

      resultContainer.append(categoryDiv.append(categoryContainer));
    });
  }

  /**
   * Updates the pagination controls based on the current state.
   * @returns {void}
   * @async
   *
   * @Author: Danilo Pantic
   */
  function updatePaginationControls() {
    $("#pageInfo").text(
      `Page ${appState.currentPage} of ${appState.totalPages}`
    );
    $("#prevPage").prop("disabled", appState.currentPage === 1);
    $("#nextPage").prop(
      "disabled",
      appState.currentPage === appState.totalPages
    );
  }

  //
  // Everything down below has been done by: Mohammed Sayed Mahmod
  //
  $("a[href='#tutorial']").click(function (e) {
    e.preventDefault();
    tour.start();
  });

  $("[data-tooltip]").hover(
    function () {
      var tooltipText = $(this).attr("data-tooltip");
      var offset = $(this).offset();

      var $tooltip = $('<div class="tooltip-info"></div>')
        .text(tooltipText)
        .appendTo("body");
      var tooltipWidth = $tooltip.outerWidth();
      var tooltipHeight = $tooltip.outerHeight();

      var tooltipPositionLeft =
        offset.left + $(this).width() / 2 - tooltipWidth / 2;
      var tooltipPositionTop = offset.top + $(this).height() + 10;

      if (tooltipPositionLeft < 0) {
        tooltipPositionLeft = 0;
      } else if (tooltipPositionLeft + tooltipWidth > $(window).width()) {
        tooltipPositionLeft = $(window).width() - tooltipWidth;
      }

      $tooltip.css({ left: tooltipPositionLeft, top: tooltipPositionTop });
    },
    function () {
      $(".tooltip-info").remove();
    }
  );

  $('input[type="radio"][name="search-type"]').change(function () {
    appState.currentSearchType = this.value;
    regenerateQuery();
  });

  $("body").on("click", "[data-action=deleteCoin]", (e) => {
    var coinId = $(e.currentTarget).attr("data-id");
    var coinIndex = coinIdToIndex(coinId);

    appState.coins.splice(coinIndex, 1);
    renderCoins();
  });

  $("body").on("click", "[data-action=editCoin]", (e) => {
    var coinId = $(e.currentTarget).attr("data-id");
    var coinIndex = coinIdToIndex(coinId);
    var coin = appState.coins[coinIndex];

    clearForm();

    const obverseQuery = $(
      "#searchBox [data-side='obverse'] [data-role='coin-description']"
    );
    const reverseQuery = $(
      "#searchBox [data-side='reverse'] [data-role='coin-description']"
    );
    const obverseKeywordsContainer = $(
      "#searchBox [data-side='obverse'] .keywordContainer"
    );
    const reverseKeywordsContainer = $(
      "#searchBox [data-side='reverse'] .keywordContainer"
    );

    $.each(coin.obverse.coin, (index, coinItem) => {
      addTagByItem(coinItem.category, coinItem.item, "obverse", obverseQuery);
    });

    $.each(coin.reverse.coin, (index, coinItem) => {
      addTagByItem(coinItem.category, coinItem.item, "reverse", reverseQuery);
    });

    function appendKeywords(keywords, container) {
      keywords.forEach((kw) => {
        let keywordSpan = $("<span></span>", {
          class: "keyword",
          "data-negated": kw.negated ? "true" : "false",
        }).appendTo(container);

        $("<span></span>", {
          class: "label",
          text: kw.text,
        }).appendTo(keywordSpan);
      });
    }

    appendKeywords(coin.obverse.keywords, obverseKeywordsContainer);
    appendKeywords(coin.reverse.keywords, reverseKeywordsContainer);
  });

  $("body").on("click", "[data-target][data-category][data-item-id]", (e) => {
    const current = $(e.currentTarget);
    const target = current
      .parent()
      .parent()
      .parent()
      .children("[data-role='coin-description']");
    const side = current.attr("data-target");

    cleanRecommendations(target);

    let category = current.attr("data-category");
    let item_id = current.attr("data-item-id");

    addTag(category, item_id, side, target);
  });

  $("[data-role='coin-description']").keyup((e) => {
    const target = $(e.currentTarget);
    const isAlphabetChar = /[a-zA-Z]/.test(e.key);

    clearTimeout(cooldown);

    if (target.val().length > 2 && isAlphabetChar) {
      cooldown = setTimeout(() => {
        getRecommendations(target.val(), target);
      }, 300);
    } else {
      cleanRecommendations(target);

      if (e.key === "Backspace" && target.attr("data-textlength") === "0") {
        removeTag(target);
      }
    }

    target.attr("data-textlength", target.val().length.toString());
  });

  $("[data-action='addKeyword']").click((e) => {
    const targetParent = $(e.currentTarget).parent();
    const target = targetParent.children("[data-role='coin-keyword']");
    const kec = targetParent.children(".keywordContainer");
    const keywordText = target.val().trim();
    const side = targetParent.parent().attr("data-side");

    if (keywordText !== "") {
      let keyword = $("<span></span>", {
        class: "keyword",
        "data-negated": "false",
      });
      let label = $("<span></span>", { class: "label" }).text(keywordText);

      keyword.append(label);
      kec.append(keyword);
      target.val("");

      const keywordObj = { text: keywordText, negated: false };

      appState.currentCoin[side].keywords.push(keywordObj);
    }
  });

  $("body").on("mouseenter", ".keywordContainer .keyword", function (e) {
    if ($(this).find(".keyword-menu").length === 0) {
      const isNegated = $(this).attr("data-negated") === "true";
      const menuHtml = `
            <div class="keyword-menu">
              <div class="negate">
                <span class="material-symbols-outlined"> remove </span
                >${isNegated ? "Unnegate" : "Negate"}
              </div>
              <div class="delete">
                <span class="material-symbols-outlined"> delete </span
                >Delete
              </div>
            </div>
        `;
      $(this).append(menuHtml);
    }
  });

  $("body").on("mouseleave", ".keywordContainer .keyword", function (e) {
    $(this).find(".keyword-menu").remove();
  });

  $("body").on(
    "click",
    ".keywordContainer .keyword .keyword-menu .delete",
    function () {
      $(this).closest(".keyword").remove();
    }
  );

  $("body").on(
    "click",
    ".keywordContainer .keyword .keyword-menu .negate",
    function () {
      const keyword = $(this).closest(".keyword");
      const label = keyword.find(".label").text();
      const isNegated = keyword.attr("data-negated") === "true";
      keyword.attr("data-negated", !isNegated);
      const side = keyword.closest("[data-side]").attr("data-side");

      const keywordsArray = appState.currentCoin[side].keywords;
      const keywordObj = keywordsArray.find((kw) => kw.text === label);
      if (keywordObj) {
        keywordObj.negated = !isNegated;
      }

      keyword.find(".keyword-menu").remove();
      keyword.trigger("mouseenter");
    }
  );

  $("[data-action='clearInputCoin']").click((e) => {
    clearForm();
  });

  $("[data-action='clearAllQueriedCoins']").click((e) => {
    appState.clearCoins();
  });

  $("[data-action='addCoin']").click((e) => {
    addCoinToQuery();
  });

  $("[data-action='editRelation']").click((e) => {
    $("#relationMenu").toggleClass("hidden");
  });

  $("[data-action='clearSPARQLEditor']").click((e) => {
    editor.setValue("");
  });

  $("[data-action='beautifySPARQLeditor']").click((e) => {
    editor.setValue(spfmt(editor.getValue()));
  });

  $("#relationMenu").on("click", ".coin-tr[data-id]", function (e) {
    insertAtEnd(
      createElementFromHTML(
        `<span contenteditable="false" class="id">${$(e.currentTarget).attr(
          "data-id"
        )}</span>`
      )
    );
  });

  $(".calculator-grid button[data-op]").click((e) => {
    const operation = $(e.currentTarget).attr("data-op");
    const operationHtmlMap = {
      p_open: '<span contenteditable="false" class="op p_open">&nbsp;</span>',
      p_close: '<span contenteditable="false" class="op p_close">&nbsp;</span>',
      and: '<span contenteditable="false" class="op and">&nbsp;</span>',
      or: '<span contenteditable="false" class="op or">&nbsp;</span>',
      not: '<span contenteditable="false" class="op not">&nbsp;</span>',
    };

    insertAtEnd(createElementFromHTML(operationHtmlMap[operation]));
  });

  $("#relationEditor").on("input", function () {
    appState.relationString = htmlToRelationString();

    regenerateQuery();
  });

  $(".calculator-grid button.clear").click((e) => {
    $("#relationEditor").empty();
  });

  $("#relationMenu .save").click((e) => {
    $("#relationMenu").toggleClass("hidden");
  });

  $("#relationMenu .close").click((e) => {
    $("#relationMenu").toggleClass("hidden");
  });

  $("#resultContainer").on("click", ".result-item", function () {
    var redirectUrl = $(this).data("redirect");

    if (redirectUrl) {
      window.open(redirectUrl, "_blank");
    }
  });

  $("[data-action=searchCoin]").click((e) => {
    performSearch();
  });

  $("[data-action=downloadResults]").click((e) => {
    e.preventDefault();

    var data = {
      action: "download",
      fileType: "csv",
      searchType: appState.currentSearchType,
      q: editor.getValue(),
    };

    var form = $("<form>", {
      method: "POST",
      action: "/callback",
    }).css({
      display: "none",
    });

    $.each(data, function (key, value) {
      form.append(
        $("<input>", {
          type: "hidden",
          name: key,
          value: value,
        })
      );
    });

    $("body").append(form);
    form.submit();
    form.remove();
  });

  $(document)
    .on("mouseenter", "#searchBox .tagContainer .tag", async function () {
      const side = $(this).closest("[data-side]").attr("data-side");
      const coin = appState.currentCoin[side].coin[$(this).index()];
      const category = coin.category;

      if (category !== "list_verb") {
        const cats = ["I", "II", "III", "IV", "V"];
        for (const cat of cats) {
          if (coin.item["Cat_" + cat] !== null) {
            const superclassData = await getSuperclasses(
              coin.item["Cat_" + cat]
            );
            if (superclassData && superclassData.class) {
              createTooltip(this, superclassData.class);
            }
          }
        }
      }
    })
    .on("mouseleave", ".tagContainer .tag", function () {
      $(".tooltip-container").remove();
    });

  $("#sortSelect, #sortDirection, #groupSelect").change(function () {
    sortResults();
    appState.renderCurrentPage();
  });

  $("#returnToQuery").click(function () {
    $("#moveableStage").attr("data-state", "query");
  });

  $("#prevPage").click(function () {
    appState.previousPage();
  });

  $("#nextPage").click(function () {
    appState.nextPage();
  });
});
